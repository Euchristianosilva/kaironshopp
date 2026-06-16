import { supabase } from "@/integrations/supabase/client";
import { mapProduct, type DbProductRow, type Product } from "@/lib/products";

export type PromotionType = "flash" | "exclusive";

export type Promotion = {
  id: string;
  name: string;
  type: PromotionType;
  discount_percent: number;
  starts_at: string;
  ends_at: string;
  active: boolean;
  product_id: string;
  seller_id: string;
};

export async function fetchActivePromotions(): Promise<Promotion[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("promotions")
    .select("id,name,type,discount_percent,starts_at,ends_at,active,product_id,seller_id")
    .eq("active", true)
    .lte("starts_at", nowIso)
    .gt("ends_at", nowIso)
    .order("ends_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Promotion[];
}

export async function fetchPromotionProducts(productIds: string[]): Promise<Product[]> {
  if (!productIds.length) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("id", productIds)
    .eq("is_active", true);
  if (error) throw error;
  return (data as DbProductRow[]).map((r) => mapProduct(r));
}
