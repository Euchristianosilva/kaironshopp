import { createServerFn } from "@tanstack/react-start";
import { mapProduct, type DbProductRow, type Product } from "@/lib/products";

export type SponsoredItem = {
  campaignId: string;
  placement: "card" | "carousel";
  product: Product;
};

/**
 * Retorna campanhas ativas (agora) para um placement.
 * Público — usa supabaseAdmin para contornar RLS, mas só seleciona campos seguros.
 */
export const getActiveSponsoredProducts = createServerFn({ method: "GET" })
  .inputValidator((input: { placement: "card" | "carousel"; limit?: number }) => {
    if (input.placement !== "card" && input.placement !== "carousel") {
      throw new Error("placement inválido");
    }
    return { placement: input.placement, limit: input.limit ?? 8 };
  })
  .handler(async ({ data }): Promise<SponsoredItem[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("ad_campaigns")
      .select("id, placement, priority, metadata, is_manual, product:products!inner(*)")
      .eq("placement", data.placement)
      .in("status", ["active", "scheduled"])
      .lte("starts_at", now)
      .gt("ends_at", now)
      .order("priority", { ascending: false })
      .limit(data.limit);
    if (error) throw error;
    return (rows ?? [])
      .filter((r: any) => {
        const adminStatus = r.metadata?.admin_status;
        const approvedForPremium = data.placement !== "carousel" || r.is_manual || adminStatus === "approved";
        return r.product && r.product.is_active && approvedForPremium;
      })
      .map((r: any) => ({
        campaignId: r.id,
        placement: r.placement,
        product: mapProduct(r.product as DbProductRow),
      }));
  });

export const trackAdImpression = createServerFn({ method: "POST" })
  .inputValidator((input: { campaignId: string }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const date = new Date().toISOString().slice(0, 10);
    await supabaseAdmin.rpc("increment_ad_metric", {
      _campaign_id: data.campaignId,
      _date: date,
      _impressions: 1,
      _clicks: 0,
    });
    return { ok: true };
  });

export const trackAdClick = createServerFn({ method: "POST" })
  .inputValidator((input: { campaignId: string }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const date = new Date().toISOString().slice(0, 10);
    await supabaseAdmin.rpc("increment_ad_metric", {
      _campaign_id: data.campaignId,
      _date: date,
      _impressions: 0,
      _clicks: 1,
    });
    return { ok: true };
  });
