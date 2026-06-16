import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy, Plus } from "lucide-react";
import { listMyTickets, createTicket } from "@/lib/support.functions";
import { TicketChat } from "@/components/support/TicketChat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Search = { t?: string };

export const Route = createFileRoute("/seller/support")({
  head: () => ({ meta: [{ title: "Suporte — Painel do Vendedor" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({ t: typeof s.t === "string" ? s.t : undefined }),
  component: SellerSupportPage,
});

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "Aberto", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  in_progress: { label: "Em atendimento", cls: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  waiting_seller: { label: "Aguardando você", cls: "bg-purple-500/10 text-purple-700 border-purple-500/30" },
  resolved: { label: "Resolvido", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  closed: { label: "Encerrado", cls: "bg-muted text-muted-foreground border-border" },
};

const CATEGORIES = [
  { v: "financial", l: "Financeiro" },
  { v: "products", l: "Produtos" },
  { v: "orders", l: "Pedidos" },
  { v: "shipping", l: "Entregas" },
  { v: "technical", l: "Problemas técnicos" },
  { v: "other", l: "Outros" },
];

function SellerSupportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const qc = useQueryClient();
  const list = useServerFn(listMyTickets);
  const create = useServerFn(createTicket);

  const { data, refetch } = useQuery({
    queryKey: ["my-support-tickets"],
    queryFn: () => list(),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`my-support-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refetch]);

  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [body, setBody] = useState("");

  const createMut = useMutation({
    mutationFn: () => create({ data: { subject, category: category as any, body } }),
    onSuccess: (r: any) => {
      toast.success("Chamado aberto!");
      setOpen(false); setSubject(""); setBody(""); setCategory("other");
      qc.invalidateQueries({ queryKey: ["my-support-tickets"] });
      navigate({ to: "/seller/support", search: { t: r.id } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const activeId = search.t;
  const tickets = (data as any)?.tickets ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
          <LifeBuoy className="h-7 w-7 text-primary" /> Suporte
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Novo chamado</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Abrir novo chamado</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold mb-1 block">Assunto</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Resumo do problema" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Categoria</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Mensagem</label>
                <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Descreva em detalhes…" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button disabled={!subject.trim() || !body.trim() || createMut.isPending} onClick={() => createMut.mutate()}>
                {createMut.isPending ? "Abrindo…" : "Abrir chamado"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-[340px_1fr] gap-0 bg-card border border-border rounded-xl overflow-hidden min-h-[600px]">
        <aside className={`border-r border-border ${activeId ? "hidden md:block" : ""}`}>
          {tickets.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nenhum chamado ainda. Clique em "Novo chamado".</p>
          ) : (
            <ul className="divide-y divide-border max-h-[700px] overflow-y-auto">
              {tickets.map((t: any) => {
                const s = STATUS[t.status] ?? STATUS.open;
                const unread = t.seller_unread ?? 0;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => navigate({ to: "/seller/support", search: { t: t.id } })}
                      className={`w-full text-left p-3 hover:bg-muted/50 ${activeId === t.id ? "bg-muted/60" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-sm truncate">{t.subject}</span>
                        {unread > 0 && <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-5 min-w-5 px-1.5 grid place-items-center">{unread}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mb-1">{t.last_message_preview}</div>
                      <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border ${s.cls}`}>{s.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
        <section className={`${!activeId ? "hidden md:flex" : "flex"} flex-col`}>
          {!activeId ? (
            <div className="m-auto text-sm text-muted-foreground">Selecione um chamado.</div>
          ) : (
            <TicketChat ticketId={activeId} onBack={() => navigate({ to: "/seller/support", search: {} })} />
          )}
        </section>
      </div>
    </div>
  );
}
