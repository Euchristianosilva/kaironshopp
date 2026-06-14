import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getSellerId(supabase: any, userId: string) {
  const { data } = await supabase.from("sellers").select("id").eq("owner_id", userId).maybeSingle();
  if (!data) throw new Error("Loja não encontrada");
  return data.id as string;
}

export const listSellerOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { status?: string; search?: string }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const sellerId = await getSellerId(supabase, userId);

    const { data: items } = await supabase
      .from("order_items")
      .select("order_id")
      .eq("seller_id", sellerId);
    const orderIds = Array.from(new Set((items ?? []).map((i: any) => i.order_id)));
    if (orderIds.length === 0) return { orders: [] };

    let q = supabase
      .from("orders")
      .select("id, created_at, buyer_id, payment_status, fulfillment_status, gross_cents, tracking_code, carrier, shipping_address, shipped_at, delivered_at")
      .in("id", orderIds)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status && data.status !== "all") q = q.eq("fulfillment_status", data.status);
    const { data: orders, error } = await q;
    if (error) throw new Error(error.message);
    return { orders: orders ?? [] };
  });

export const getSellerOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { orderId: string }) => z.object({ orderId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const sellerId = await getSellerId(supabase, userId);
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order) throw new Error("Pedido não encontrado");

    const { data: items } = await supabase
      .from("order_items")
      .select("id, title, qty, unit_price, gross_cents, seller_net_cents, variant_label, product_id, seller_id")
      .eq("order_id", data.orderId)
      .eq("seller_id", sellerId);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", order.buyer_id)
      .maybeSingle();

    return { order, items: items ?? [], buyer: profile };
  });

export const updateFulfillment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { orderId: string; fulfillment_status?: string; tracking_code?: string; carrier?: string; seller_notes?: string }) =>
    z.object({
      orderId: z.string().uuid(),
      fulfillment_status: z.enum(["pending","processing","shipped","delivered","canceled","returned"]).optional(),
      tracking_code: z.string().max(100).optional(),
      carrier: z.string().max(100).optional(),
      seller_notes: z.string().max(2000).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const patch: any = {};
    if (data.fulfillment_status) {
      patch.fulfillment_status = data.fulfillment_status;
      if (data.fulfillment_status === "shipped") patch.shipped_at = new Date().toISOString();
      if (data.fulfillment_status === "delivered") patch.delivered_at = new Date().toISOString();
    }
    if (data.tracking_code !== undefined) patch.tracking_code = data.tracking_code || null;
    if (data.carrier !== undefined) patch.carrier = data.carrier || null;
    if (data.seller_notes !== undefined) patch.seller_notes = data.seller_notes || null;
    const { error } = await supabase.from("orders").update(patch).eq("id", data.orderId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSellerCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const sellerId = await getSellerId(supabase, userId);

    const { data: items } = await supabase
      .from("order_items")
      .select("order_id, gross_cents, seller_net_cents")
      .eq("seller_id", sellerId);
    const orderIds = Array.from(new Set((items ?? []).map((i: any) => i.order_id)));
    if (orderIds.length === 0) return { customers: [] };

    const { data: orders } = await supabase
      .from("orders")
      .select("id, buyer_id, gross_cents, created_at, payment_status")
      .in("id", orderIds);

    const byBuyer = new Map<string, { buyer_id: string; orders: number; total_cents: number; last_order: string }>();
    for (const o of orders ?? []) {
      const cur = byBuyer.get(o.buyer_id) ?? { buyer_id: o.buyer_id, orders: 0, total_cents: 0, last_order: o.created_at };
      cur.orders += 1;
      if (o.payment_status === "paid") cur.total_cents += o.gross_cents ?? 0;
      if (o.created_at > cur.last_order) cur.last_order = o.created_at;
      byBuyer.set(o.buyer_id, cur);
    }
    const buyerIds = Array.from(byBuyer.keys());
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", buyerIds);
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    const customers = Array.from(byBuyer.values())
      .map((c) => ({ ...c, profile: profileMap.get(c.buyer_id) ?? null }))
      .sort((a, b) => b.total_cents - a.total_cents);

    return { customers };
  });
