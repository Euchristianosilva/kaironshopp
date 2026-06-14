import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base || "loja"}-${Math.random().toString(36).slice(2, 6)}`;
}

export const createMyStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; description?: string }) => {
    if (!input?.name || input.name.trim().length < 2) throw new Error("Nome inválido");
    if (input.name.length > 80) throw new Error("Nome muito longo");
    if (input.description && input.description.length > 500) throw new Error("Descrição muito longa");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Disallow second store for same owner
    const { data: existing } = await supabaseAdmin
      .from("sellers")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (existing) throw new Error("Você já possui uma loja.");

    const { data: seller, error } = await supabaseAdmin
      .from("sellers")
      .insert({
        owner_id: userId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        slug: slugify(data.name),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Grant seller role (server-only; RLS no longer permits this from the client)
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "seller" })
      .select();

    return { sellerId: seller.id };
  });
