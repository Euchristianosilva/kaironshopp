import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getSeller(supabase: any, userId: string) {
  const { data } = await supabase.from("sellers").select("id").eq("owner_id", userId).maybeSingle();
  if (!data) throw new Error("Loja não encontrada");
  return data;
}

export const listStockMovements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { product_id?: string | null }) => i)
  .handler(async ({ data, context }) => {
    const seller = await getSeller(context.supabase, context.userId);
    let q = context.supabase
      .from("stock_movements")
      .select("id, product_id, variant_id, kind, quantity, reason, created_at, products(title)")
      .eq("seller_id", seller.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.product_id) q = q.eq("product_id", data.product_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const { data: products } = await context.supabase
      .from("products")
      .select("id, title, stock, min_stock, is_active")
      .eq("seller_id", seller.id)
      .order("title");

    return { movements: rows ?? [], products: products ?? [] };
  });

export const createStockMovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { product_id: string; kind: "in" | "out" | "adjust"; quantity: number; reason?: string }) => {
    if (!i.product_id) throw new Error("Produto obrigatório");
    if (!["in", "out", "adjust"].includes(i.kind)) throw new Error("Tipo inválido");
    const qty = Number(i.quantity);
    if (!Number.isFinite(qty) || qty <= 0) throw new Error("Quantidade inválida");
    return { product_id: i.product_id, kind: i.kind, quantity: Math.floor(qty), reason: (i.reason ?? "").slice(0, 240) };
  })
  .handler(async ({ data, context }) => {
    const seller = await getSeller(context.supabase, context.userId);
    const { data: prod, error: pErr } = await context.supabase
      .from("products")
      .select("id, stock, seller_id")
      .eq("id", data.product_id)
      .maybeSingle();
    if (pErr || !prod || prod.seller_id !== seller.id) throw new Error("Produto inválido");

    const current = Number(prod.stock ?? 0);
    const next = data.kind === "in" ? current + data.quantity
      : data.kind === "out" ? Math.max(0, current - data.quantity)
      : data.quantity;

    const { error: uErr } = await context.supabase.from("products").update({ stock: next }).eq("id", data.product_id);
    if (uErr) throw new Error(uErr.message);

    const { error: mErr } = await context.supabase.from("stock_movements").insert({
      seller_id: seller.id, product_id: data.product_id, kind: data.kind,
      quantity: data.quantity, reason: data.reason || null, created_by: context.userId,
    });
    if (mErr) throw new Error(mErr.message);
    return { ok: true, stock: next };
  });
