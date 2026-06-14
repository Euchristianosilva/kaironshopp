import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { useAuth } from "@/hooks/use-auth";
import { listMyConversations, getConversation, sendMessage } from "@/lib/chat.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Store, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type Search = { c?: string };

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Mensagens — MercaBrasil" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({ c: typeof s.c === "string" ? s.c : undefined }),
  component: MessagesPage,
});

function MessagesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { c: activeId } = useSearch({ from: "/messages" }) as Search;

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  const list = useServerFn(listMyConversations);
  const { data: convs, refetch } = useQuery({
    queryKey: ["my-conversations"],
    queryFn: () => list(),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`conv-list-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refetch]);

  if (loading || !user) return <Shell><p className="text-muted-foreground">Carregando...</p></Shell>;

  return (
    <Shell>
      <h1 className="text-3xl font-black flex items-center gap-2 mb-6">
        <MessageCircle className="h-7 w-7 text-primary" /> Mensagens
      </h1>
      <div className="grid md:grid-cols-[320px_1fr] gap-4 bg-card border border-border rounded-xl overflow-hidden min-h-[600px]">
        <aside className={`border-r border-border ${activeId ? "hidden md:block" : ""}`}>
          {!convs?.conversations.length ? (
            <p className="p-6 text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
          ) : (
            <ul className="divide-y divide-border max-h-[700px] overflow-y-auto">
              {convs.conversations.map((c: any) => {
                const isSeller = convs.sellerId === c.seller_id;
                const other = isSeller ? c.buyer_profile?.full_name ?? "Cliente" : c.sellers?.name ?? "Loja";
                const avatar = isSeller ? c.buyer_profile?.avatar_url : c.sellers?.logo_url;
                const unread = isSeller ? c.seller_unread : c.buyer_unread;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => navigate({ to: "/messages", search: { c: c.id } })}
                      className={`w-full text-left p-4 hover:bg-secondary/50 transition flex gap-3 ${activeId === c.id ? "bg-secondary/40" : ""}`}
                    >
                      {avatar ? <img src={avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                        : <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center text-primary"><Store className="h-5 w-5" /></div>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold truncate">{other}</span>
                          {unread > 0 && <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-5 px-1.5 grid place-items-center">{unread}</span>}
                        </div>
                        {c.products?.title && <div className="text-[11px] text-muted-foreground truncate">{c.products.title}</div>}
                        <div className="text-xs text-muted-foreground truncate">{c.last_message_preview ?? "Sem mensagens"}</div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className={`flex flex-col ${!activeId ? "hidden md:flex" : ""}`}>
          {activeId ? <ChatPane key={activeId} conversationId={activeId} onBack={() => navigate({ to: "/messages", search: {} })} />
            : <div className="flex-1 grid place-items-center text-muted-foreground text-sm">Selecione uma conversa</div>}
        </section>
      </div>
    </Shell>
  );
}

function ChatPane({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const get = useServerFn(getConversation);
  const send = useServerFn(sendMessage);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, refetch } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => get({ data: { conversation_id: conversationId } }),
  });

  useEffect(() => {
    const ch = supabase.channel(`msgs-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => { refetch(); qc.invalidateQueries({ queryKey: ["my-conversations"] }); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId, refetch, qc]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [data?.messages.length]);

  const sendMut = useMutation({
    mutationFn: () => send({ data: { conversation_id: conversationId, body: text } }),
    onSuccess: () => { setText(""); refetch(); qc.invalidateQueries({ queryKey: ["my-conversations"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!data) return <div className="flex-1 grid place-items-center text-muted-foreground">Carregando...</div>;

  const otherName = data.role === "seller"
    ? (data.conversation as any).buyer_profile?.full_name ?? "Cliente"
    : (data.conversation as any).sellers?.name ?? "Loja";

  return (
    <>
      <div className="p-4 border-b border-border flex items-center gap-2">
        <button className="md:hidden p-1.5 hover:bg-secondary rounded" onClick={onBack}><ArrowLeft className="h-4 w-4" /></button>
        <div>
          <div className="font-bold">{otherName}</div>
          {(data.conversation as any).products?.title && (
            <div className="text-xs text-muted-foreground">Sobre: {(data.conversation as any).products.title}</div>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/20" style={{ maxHeight: 540 }}>
        {data.messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Envie a primeira mensagem.</p>
        ) : data.messages.map((m: any) => {
          const mine = m.sender_id === data.me;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) sendMut.mutate(); }} className="p-3 border-t border-border flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Digite sua mensagem..." maxLength={4000} />
        <Button type="submit" disabled={!text.trim() || sendMut.isPending}><Send className="h-4 w-4" /></Button>
      </form>
    </>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
      <Footer />
    </div>
  );
}
