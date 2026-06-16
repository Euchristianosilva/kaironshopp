import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getSellerId(supabase: any, userId: string) {
  const { data } = await supabase.from("sellers").select("id").eq("owner_id", userId).maybeSingle();
  if (!data) throw new Error("Loja não encontrada");
  return data.id as string;
}

// ============ COUPONS ============
export const listCoupons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sellerId = await getSellerId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("coupons").select("*").eq("seller_id", sellerId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: {
    id?: string; code: string; discount_type: "percent" | "fixed"; discount_value: number;
    min_purchase_cents?: number; max_uses?: number | null; valid_until?: string | null; active?: boolean;
  }) => i)
  .handler(async ({ data, context }) => {
    const sellerId = await getSellerId(context.supabase, context.userId);
    const row: any = {
      seller_id: sellerId,
      code: data.code.trim().toUpperCase(),
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      min_purchase_cents: data.min_purchase_cents ?? 0,
      max_uses: data.max_uses ?? null,
      valid_until: data.valid_until || null,
      active: data.active ?? true,
    };
    if (data.id) {
      const { error } = await context.supabase.from("coupons").update(row).eq("id", data.id).eq("seller_id", sellerId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("coupons").insert(row);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ data, context }) => {
    const sellerId = await getSellerId(context.supabase, context.userId);
    const { error } = await context.supabase.from("coupons").delete().eq("id", data.id).eq("seller_id", sellerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ PROMOTIONS ============
export const listPromotions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sellerId = await getSellerId(context.supabase, context.userId);
    const [{ data: promos }, { data: products }] = await Promise.all([
      context.supabase.from("promotions").select("*").eq("seller_id", sellerId).order("created_at", { ascending: false }),
      context.supabase.from("products").select("id, title").eq("seller_id", sellerId).order("title"),
    ]);
    return { promotions: promos ?? [], products: products ?? [] };
  });

export const upsertPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: {
    id?: string; product_id: string; name: string; discount_percent: number;
    type?: "flash" | "exclusive";
    starts_at?: string; ends_at: string; active?: boolean;
  }) => i)
  .handler(async ({ data, context }) => {
    const sellerId = await getSellerId(context.supabase, context.userId);
    const row: any = {
      seller_id: sellerId,
      product_id: data.product_id,
      name: data.name,
      discount_percent: data.discount_percent,
      type: data.type ?? "flash",
      starts_at: data.starts_at || new Date().toISOString(),
      ends_at: data.ends_at,
      active: data.active ?? true,
    };
    if (data.id) {
      const { error } = await context.supabase.from("promotions").update(row).eq("id", data.id).eq("seller_id", sellerId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("promotions").insert(row);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deletePromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ data, context }) => {
    const sellerId = await getSellerId(context.supabase, context.userId);
    const { error } = await context.supabase.from("promotions").delete().eq("id", data.id).eq("seller_id", sellerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ REVIEWS ============
export const listSellerReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sellerId = await getSellerId(context.supabase, context.userId);
    const { data: reviews, error } = await context.supabase
      .from("reviews")
      .select("*, products(title)")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const buyerIds = Array.from(new Set((reviews ?? []).map((r: any) => r.buyer_id)));
    let profiles: any[] = [];
    if (buyerIds.length) {
      const { data } = await context.supabase.from("profiles").select("id, full_name").in("id", buyerIds);
      profiles = data ?? [];
    }
    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    const enriched = (reviews ?? []).map((r: any) => ({
      ...r,
      buyer_name: profileMap.get(r.buyer_id)?.full_name ?? "Cliente",
      product_title: r.products?.title ?? "Produto",
    }));

    const total = enriched.length;
    const avg = total ? enriched.reduce((a, r) => a + r.rating, 0) / total : 0;
    return { reviews: enriched, total, avg };
  });

export const replyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; reply: string }) => i)
  .handler(async ({ data, context }) => {
    const sellerId = await getSellerId(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("reviews")
      .update({ seller_reply: data.reply, seller_replied_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("seller_id", sellerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
