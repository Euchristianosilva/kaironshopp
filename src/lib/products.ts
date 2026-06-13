import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  rating: number;
  sold: number;
  category: string;
  seller: string;
  image: string;
  freeShipping?: boolean;
  description?: string;
  stock?: number;
  isFeatured?: boolean;
  isActive?: boolean;
  sellerId?: string | null;
};

export type DbProductRow = {
  id: string;
  seller_id: string | null;
  category_slug: string;
  title: string;
  description: string | null;
  price: number | string;
  original_price: number | string | null;
  image_url: string | null;
  rating: number | string | null;
  reviews_count: number | null;
  stock: number | null;
  free_shipping: boolean | null;
  is_featured: boolean | null;
  is_active: boolean | null;
};

export function mapProduct(row: DbProductRow, sellerName = "Loja Oficial"): Product {
  return {
    id: row.id,
    name: row.title,
    price: Number(row.price),
    oldPrice: row.original_price ? Number(row.original_price) : undefined,
    rating: Number(row.rating ?? 0),
    sold: row.reviews_count ?? 0,
    category: row.category_slug,
    seller: sellerName,
    image:
      row.image_url ??
      "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=70",
    freeShipping: !!row.free_shipping,
    description: row.description ?? undefined,
    stock: row.stock ?? 0,
    isFeatured: !!row.is_featured,
    isActive: row.is_active ?? true,
    sellerId: row.seller_id,
  };
}

export async function fetchProducts(opts: {
  category?: string;
  featured?: boolean;
  limit?: number;
} = {}): Promise<Product[]> {
  let q = supabase.from("products").select("*").eq("is_active", true);
  if (opts.category) q = q.eq("category_slug", opts.category);
  if (opts.featured) q = q.eq("is_featured", true);
  q = q.order("created_at", { ascending: false }).limit(opts.limit ?? 24);
  const { data, error } = await q;
  if (error) throw error;
  return (data as DbProductRow[]).map((r) => mapProduct(r));
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapProduct(data as DbProductRow);
}

export async function fetchAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as DbProductRow[]).map((r) => mapProduct(r));
}
