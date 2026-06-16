import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: seller } = await supabase.from("sellers").select("id").eq("owner_id", userId).maybeSingle();
    const sellerId = seller?.id ?? null;

    const orFilter = sellerId
      ? `buyer_id.eq.${userId},seller_id.eq.${sellerId}`
      : `buyer_id.eq.${userId}`;

    const { data, error } = await supabase
      .from("conversations")
      .select("id, buyer_id, seller_id, product_id, last_message_at, last_message_preview, buyer_unread, seller_unread, sellers(name, logo_url), products(title)")
      .or(orFilter)
      .order("last_message_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const buyerIds = Array.from(new Set((data ?? []).map((c: any) => c.buyer_id)));
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", buyerIds);
    const pmap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return {
      sellerId,
      conversations: (data ?? []).map((c: any) => ({
        ...c,
        buyer_profile: pmap.get(c.buyer_id) ?? null,
      })),
    };
  });

export const getOrCreateConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { seller_id: string; product_id?: string | null }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Don't allow seller to message their own store
    const { data: seller } = await supabase.from("sellers").select("id, owner_id").eq("id", data.seller_id).maybeSingle();
    if (!seller) throw new Error("Loja não encontrada");
    if (seller.owner_id === userId) throw new Error("Você não pode conversar com sua própria loja");

    const productId = data.product_id ?? null;
    const base = supabase.from("conversations").select("id").eq("buyer_id", userId).eq("seller_id", data.seller_id);
    const { data: existing } = productId
      ? await base.eq("product_id", productId).maybeSingle()
      : await base.is("product_id", null).maybeSingle();
    if (existing) return { id: existing.id };

    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ buyer_id: userId, seller_id: data.seller_id, product_id: productId })
      .select("id").single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const getConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { conversation_id: string }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: conv, error } = await supabase
      .from("conversations")
      .select("id, buyer_id, seller_id, product_id, sellers(id, name, logo_url, owner_id), products(id, title)")
      .eq("id", data.conversation_id)
      .maybeSingle();
    if (error || !conv) throw new Error("Conversa não encontrada");

    const isBuyer = conv.buyer_id === userId;
    const isSeller = (conv as any).sellers?.owner_id === userId;
    if (!isBuyer && !isSeller) throw new Error("Sem acesso");

    const { data: profile } = await supabase.from("profiles").select("id, full_name, avatar_url").eq("id", conv.buyer_id).maybeSingle();

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("id, sender_id, body, read_at, created_at")
      .eq("conversation_id", data.conversation_id)
      .order("created_at", { ascending: true })
      .limit(500);
    if (messagesError) throw new Error(messagesError.message);

    // mark messages from the other party as read
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", data.conversation_id)
      .neq("sender_id", userId)
      .is("read_at", null);

    // reset my unread counter
    await supabase.from("conversations").update(isBuyer
      ? { buyer_unread: 0 }
      : { seller_unread: 0 }
    ).eq("id", data.conversation_id);

    return { conversation: { ...conv, buyer_profile: profile }, messages: messages ?? [], me: userId, role: isBuyer ? "buyer" : "seller" };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { conversation_id: string; body: string }) => {
    const body = (i.body ?? "").trim();
    if (!body || body.length > 4000) throw new Error("Mensagem inválida");
    return { conversation_id: i.conversation_id, body };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: message, error } = await supabase
      .from("messages")
      .insert({ conversation_id: data.conversation_id, sender_id: userId, body: data.body })
      .select("id, conversation_id, sender_id, body, read_at, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, message };
  });
