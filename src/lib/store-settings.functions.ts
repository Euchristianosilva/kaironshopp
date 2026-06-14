import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getSellerForOwner(supabase: any, userId: string) {
  const { data } = await supabase.from("sellers").select("*").eq("owner_id", userId).maybeSingle();
  if (!data) throw new Error("Loja não encontrada");
  return data;
}

export const getStoreSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return await getSellerForOwner(context.supabase, context.userId);
  });

export const updateStoreSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: {
    name?: string; description?: string; logo_url?: string | null; banner_url?: string | null;
    email?: string | null; phone?: string | null; whatsapp?: string | null;
    seo_title?: string | null; seo_description?: string | null; seo_keywords?: string | null;
    shipping_policy?: string | null; return_policy?: string | null; terms?: string | null;
    vacation_mode?: boolean;
    origin_zip?: string | null; origin_state?: string | null; origin_city?: string | null;
    origin_district?: string | null; origin_address?: string | null;
    origin_number?: string | null; origin_complement?: string | null;
  }) => i)
  .handler(async ({ data, context }) => {
    const seller = await getSellerForOwner(context.supabase, context.userId);
    const { error } = await context.supabase.from("sellers").update(data).eq("id", seller.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Reports
export const getSellerReportData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { from?: string; to?: string }) => i)
  .handler(async ({ data, context }) => {
    const seller = await getSellerForOwner(context.supabase, context.userId);
    const from = data.from ? new Date(data.from).toISOString() : new Date(Date.now() - 30 * 86400000).toISOString();
    const to = data.to ? new Date(data.to).toISOString() : new Date().toISOString();

    const [{ data: items }, { data: orders }, { data: products }] = await Promise.all([
      context.supabase.from("order_items")
        .select("id, created_at, product_id, product_title, qty, gross_cents, platform_fee_cents, seller_net_cents, order_id, variant_label")
        .eq("seller_id", seller.id).gte("created_at", from).lte("created_at", to)
        .order("created_at", { ascending: false }),
      context.supabase.from("orders")
        .select("id, created_at, gross_cents, payment_status, fulfillment_status, buyer_id, tracking_code, carrier")
        .eq("seller_id", seller.id).gte("created_at", from).lte("created_at", to)
        .order("created_at", { ascending: false }),
      context.supabase.from("products")
        .select("id, title, price_cents, stock_qty, min_stock, active")
        .eq("seller_id", seller.id).order("title"),
    ]);

    return { items: items ?? [], orders: orders ?? [], products: products ?? [], from, to };
  });
