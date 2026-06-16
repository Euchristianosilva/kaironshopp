import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { listAllTickets } from "@/lib/support.functions";
import { TicketChat } from "@/components/support/TicketChat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Search = { t?: string; status?: string };

export const Route = createFileRoute("/admin/support")({
  head: () => ({ meta: [{ title: "Suporte — Admin" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    t: typeof s.t === "string" ? s.t : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
  }),
  component: AdminSupportPage,
});

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "Aberto", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  in_progress: { label: "Em atendimento", cls: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  waiting_seller: { label: "Aguardando vendedor", cls: "bg-purple-500/10 text-purple-700 border-purple-500/30" },
  resolved: { label: "Resolvido", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  closed: { label: "Encerrado", cls: "bg-muted text-muted-foreground border-border" },
};

function AdminSupportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const qc = useQueryClient();
  const list = useServerFn(listAllTickets);

  const status = search.status ?? "all";

  const { data, refetch } = useQuery({
    queryKey: ["support-tickets-list", status],
    queryFn: () => list({ data: { status: status as any } }),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`admin-support-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refetch, qc]);

  const tickets = (data as any)?.tickets ?? [];
  const activeId = search.t;

  return (
    <AdminShell title="Central de Suporte" description="Gerencie chamados abertos pelos vendedores.">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Filtrar:</span>
        <Select value={status} onValueChange={(v) => navigate({ to: "/admin/support", search: { ...search, status: v } })}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-[360px_1fr] gap-0 bg-card border border-border rounded-xl overflow-hidden min-h-[600px]">
        <aside className={`border-r border-border ${activeId ? "hidden md:block" : ""}`}>
          {tickets.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground flex items-center gap-2">
              <LifeBuoy className="h-4 w-4" /> Nenhum chamado.
            </p>
          ) : (
            <ul className="divide-y divide-border max-h-[700px] overflow-y-auto">
              {tickets.map((t: any) => {
                const s = STATUS[t.status] ?? STATUS.open;
                const unread = t.agent_unread ?? 0;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => navigate({ to: "/admin/support", search: { ...search, t: t.id } })}
                      className={`w-full text-left p-3 hover:bg-muted/50 ${activeId === t.id ? "bg-muted/60" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-sm truncate">{t.subject}</span>
                        {unread > 0 && (
                          <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-5 min-w-5 px-1.5 grid place-items-center">{unread}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {t.sellers?.name ?? t.opener?.full_name ?? "Vendedor"}
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
            <TicketChat
              ticketId={activeId}
              canManage
              onBack={() => navigate({ to: "/admin/support", search: { ...search, t: undefined } })}
            />
          )}
        </section>
      </div>
    </AdminShell>
  );
}
