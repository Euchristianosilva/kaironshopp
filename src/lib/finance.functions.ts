import { createServerFn } from "@tanstack/react-start";
import Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada");
  return new Stripe(key);
}

export const getSellerFinance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const stripe = stripeClient();
    const { supabase, userId } = context;

    const { data: seller } = await supabase.rpc("get_my_seller");
    if (!seller) throw new Error("Loja não encontrada");

    let balance: any = null;
    let transfers: any[] = [];
    if (seller.stripe_account_id && seller.stripe_charges_enabled) {
      try {
        balance = await stripe.balance.retrieve({}, { stripeAccount: seller.stripe_account_id });
        const tr = await stripe.transfers.list({ destination: seller.stripe_account_id, limit: 20 });
        transfers = tr.data;
      } catch (e) {
        console.error("stripe balance error:", e);
      }
    }

    const { data: salesRows } = await supabase
      .from("order_items")
      .select("gross_cents, platform_fee_cents, seller_net_cents, created_at, order_id, stripe_transfer_id")
      .eq("seller_id", seller.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: payouts } = await supabase
      .from("payouts")
      .select("*")
      .eq("seller_id", seller.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const totals = (salesRows ?? []).reduce(
      (a, r: any) => ({
        gross: a.gross + (r.gross_cents ?? 0),
        fee: a.fee + (r.platform_fee_cents ?? 0),
        net: a.net + (r.seller_net_cents ?? 0),
        count: a.count + 1,
      }),
      { gross: 0, fee: 0, net: 0, count: 0 },
    );

    return { seller, balance, transfers, sales: salesRows ?? [], payouts: payouts ?? [], totals };
  });

export const getAdminFinance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as any)?.email as string | undefined;
    const { assertAdminAccess } = await import("@/lib/admin-auth.server");
    await assertAdminAccess(context.userId, email);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id, gross_cents, platform_fee_cents, payment_status, seller_id, created_at, stripe_session_id")
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false })
      .limit(100);

    const totals = (orders ?? []).reduce(
      (a, o: any) => ({
        gross: a.gross + (o.gross_cents ?? 0),
        fee: a.fee + (o.platform_fee_cents ?? 0),
        net: a.net + ((o.gross_cents ?? 0) - (o.platform_fee_cents ?? 0)),
        count: a.count + 1,
      }),
      { gross: 0, fee: 0, net: 0, count: 0 },
    );

    const { data: settings } = await supabaseAdmin.from("platform_settings").select("*").eq("id", true).maybeSingle();

    return { orders: orders ?? [], totals, settings };
  });

export const updateCommission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { commission_percent: number }) => i)
  .handler(async ({ data, context }) => {
    const email = (context.claims as any)?.email as string | undefined;
    const { assertAdminAccess } = await import("@/lib/admin-auth.server");
    await assertAdminAccess(context.userId, email);
    if (data.commission_percent < 0 || data.commission_percent > 100) throw new Error("Valor inválido");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("platform_settings")
      .update({ commission_percent: data.commission_percent })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
