import { createServerFn } from "@tanstack/react-start";
import Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CartItem = { productId: string; qty: number };

export const verifyStripeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { session_id: string }) => input)
  .handler(async ({ data, context }) => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY não configurada");
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.retrieve(data.session_id);
    const orderId = (session.metadata as any)?.order_id as string | undefined;
    if (!orderId) throw new Error("Pedido não encontrado nesta sessão");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, buyer_id, payment_status, status, total")
      .eq("id", orderId)
      .maybeSingle();
    if (!order || order.buyer_id !== context.userId) throw new Error("Pedido não encontrado");

    if (session.payment_status === "paid" && order.payment_status !== "paid") {
      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid",
          status: "paid",
          stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        })
        .eq("id", orderId);
    }
    return {
      orderId,
      total: order.total,
      paid: session.payment_status === "paid" || order.payment_status === "paid",
    };
  });


export const createStripeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { items: CartItem[]; origin: string }) => input)
  .handler(async ({ data, context }) => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY não configurada");
    if (!data.items?.length) throw new Error("Carrinho vazio");

    const stripe = new Stripe(key);
    const { supabase, userId } = context;

    const ids = data.items.map((i) => i.productId);
    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("id, title, price, image_url, seller_id")
      .in("id", ids);
    if (prodErr) throw new Error(prodErr.message);
    if (!products?.length) throw new Error("Produtos não encontrados");

    // Group by seller — option A: only one seller per checkout
    const sellerIds = Array.from(new Set(products.map((p: any) => p.seller_id).filter(Boolean)));
    if (sellerIds.length === 0) throw new Error("Produtos sem vendedor associado");
    if (sellerIds.length > 1) {
      throw new Error("Você pode finalizar produtos de apenas uma loja por vez. Separe seu pedido.");
    }
    const sellerId = sellerIds[0] as string;

    const { data: seller, error: sellerErr } = await supabase
      .from("sellers")
      .select("id, name, stripe_account_id, stripe_charges_enabled")
      .eq("id", sellerId)
      .maybeSingle();
    if (sellerErr) throw new Error(sellerErr.message);
    if (!seller?.stripe_account_id || !seller.stripe_charges_enabled) {
      throw new Error(`A loja "${seller?.name ?? ""}" ainda não está pronta para receber pagamentos.`);
    }

    // Commission %
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("commission_percent")
      .eq("id", true)
      .maybeSingle();
    const commissionPct = Number(settings?.commission_percent ?? 10);

    // Build line items + compute totals (cents)
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let grossCents = 0;
    const itemRows: any[] = [];

    for (const i of data.items) {
      const p: any = products.find((x: any) => x.id === i.productId);
      if (!p) throw new Error(`Produto ${i.productId} não encontrado`);
      const unit = Math.round(Number(p.price) * 100);
      const subtotal = unit * i.qty;
      grossCents += subtotal;
      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: { name: p.title, images: p.image_url ? [p.image_url] : undefined },
          unit_amount: unit,
        },
        quantity: i.qty,
      });
      itemRows.push({
        product_id: p.id,
        title: p.title,
        qty: i.qty,
        unit_price: unit / 100,
        gross_cents: subtotal,
        seller_id: sellerId,
        stripe_account_id: seller.stripe_account_id,
      });
    }

    const platformFeeCents = Math.round((grossCents * commissionPct) / 100);

    // Distribute fee proportionally per item
    let allocated = 0;
    itemRows.forEach((row, idx) => {
      const isLast = idx === itemRows.length - 1;
      const fee = isLast ? platformFeeCents - allocated : Math.round((row.gross_cents * platformFeeCents) / grossCents);
      allocated += fee;
      row.platform_fee_cents = fee;
      row.seller_net_cents = row.gross_cents - fee;
    });

    // Create order (pending) — uses admin client to bypass RLS for trusted server-computed financial fields
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        buyer_id: userId,
        seller_id: sellerId,
        gross_cents: grossCents,
        platform_fee_cents: platformFeeCents,
        payment_status: "pending",
        total: grossCents / 100,
        status: "pending",
      })
      .select("id")
      .single();
    if (orderErr) throw new Error("Falha ao criar pedido: " + orderErr.message);

    // Create order_items
    const itemsPayload = itemRows.map((r) => ({
      order_id: order.id,
      product_id: r.product_id,
      title: r.title,
      qty: r.qty,
      unit_price: r.unit_price,
      seller_id: r.seller_id,
      stripe_account_id: r.stripe_account_id,
      gross_cents: r.gross_cents,
      platform_fee_cents: r.platform_fee_cents,
      seller_net_cents: r.seller_net_cents,
    }));
    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(itemsPayload);
    if (itemsErr) throw new Error("Falha ao criar itens: " + itemsErr.message);

    // Stripe Checkout with destination charge + application fee
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      payment_intent_data: {
        application_fee_amount: platformFeeCents,
        transfer_data: { destination: seller.stripe_account_id },
        metadata: { order_id: order.id, seller_id: sellerId },
      },
      metadata: { order_id: order.id, seller_id: sellerId, user_id: userId },
      success_url: `${data.origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.origin}/checkout?payment=canceled`,
    });

    await supabaseAdmin
      .from("orders")
      .update({ stripe_session_id: session.id, stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null })
      .eq("id", order.id);

    return { url: session.url };
  });

