import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTicket, sendTicketMessage, updateTicketStatus, transferTicket } from "@/lib/support.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ArrowLeft, CheckCircle2, Clock, LifeBuoy, ArrowRightLeft, Info } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STATUS_LABEL: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em atendimento",
  waiting_seller: "Aguardando vendedor",
  resolved: "Resolvido",
  closed: "Encerrado",
};

const DEPT_LABEL: Record<string, string> = {
  financial: "Financeiro",
  commercial: "Comercial",
  logistics: "Logística",
  technical: "Técnico",
  general: "Atendimento Geral",
};

export function TicketChat({
  ticketId,
  onBack,
  canManage = false,
}: {
  ticketId: string;
  onBack?: () => void;
  canManage?: boolean;
}) {
  const qc = useQueryClient();
  const fetchTicket = useServerFn(getTicket);
  const send = useServerFn(sendTicketMessage);
  const setStatus = useServerFn(updateTicketStatus);
  const transfer = useServerFn(transferTicket);
  const [text, setText] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const queryKey = ["ticket", ticketId];
  const { data, refetch, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchTicket({ data: { ticket_id: ticketId } }),
    enabled: !!ticketId,
  });

  useEffect(() => {
    if (!ticketId) return;
    const ch = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${ticketId}` },
        () => {
          refetch();
          qc.invalidateQueries({ queryKey: ["support-tickets-list"] });
          qc.invalidateQueries({ queryKey: ["my-support-tickets"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ticketId, refetch, qc]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [data?.messages?.length]);

  const sendMut = useMutation({
    mutationFn: async (body: string) => send({ data: { ticket_id: ticketId, body } }),
    onSuccess: (res: any) => {
      if (res?.message) {
        qc.setQueryData(queryKey, (curr: any) =>
          curr ? { ...curr, messages: [...curr.messages, res.message] } : curr
        );
      }
      setText("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao enviar"),
  });

  const statusMut = useMutation({
    mutationFn: async (status: string) => setStatus({ data: { ticket_id: ticketId, status: status as any } }),
    onSuccess: () => {
      toast.success("Status atualizado");
      refetch();
      qc.invalidateQueries({ queryKey: ["support-tickets-list"] });
    },
  });

  const transferMut = useMutation({
    mutationFn: async (department: string) =>
      transfer({ data: { ticket_id: ticketId, department: department as any } }),
    onSuccess: () => {
      toast.success("Chamado transferido");
      refetch();
      qc.invalidateQueries({ queryKey: ["support-tickets-list"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao transferir"),
  });

  if (isLoading || !data) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  }

  const t = (data as any).ticket;
  const me = (data as any).me as string;

  return (
    <div className="flex flex-col h-[70vh]">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        {onBack && (
          <Button size="icon" variant="ghost" onClick={onBack} className="md:hidden">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <LifeBuoy className="h-5 w-5 text-primary shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-bold truncate">{t.subject}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {t.sellers?.name ?? "Vendedor"} · {STATUS_LABEL[t.status]} · {DEPT_LABEL[t.department] ?? "—"}
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Select value={t.department ?? "general"} onValueChange={(v) => { if (v !== t.department) transferMut.mutate(v); }}>
              <SelectTrigger className="h-8 w-[180px]" title="Transferir para outro departamento">
                <ArrowRightLeft className="h-3.5 w-3.5 mr-1 inline" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DEPT_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={t.status} onValueChange={(v) => statusMut.mutate(v)}>
              <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </header>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-muted/20">
        {(data as any).messages.map((m: any) => {
          if (m.sender_type === "system") {
            return (
              <div key={m.id} className="flex justify-center">
                <div className="text-[11px] bg-muted text-muted-foreground border border-border rounded-full px-3 py-1 flex items-center gap-1.5">
                  <Info className="h-3 w-3" />
                  {m.body}
                </div>
              </div>
            );
          }
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                {!mine && (
                  <div className="text-[10px] uppercase font-bold opacity-70 mb-0.5">
                    {m.sender_type === "agent" ? "Suporte" : m.sender?.full_name ?? "Vendedor"}
                  </div>
                )}
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? "opacity-70" : "text-muted-foreground"}`}>
                  <Clock className="h-2.5 w-2.5" />
                  {new Date(m.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  {mine && m.read_at && <CheckCircle2 className="h-3 w-3 ml-1" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); const v = text.trim(); if (v && !sendMut.isPending) sendMut.mutate(v); }}
        className="border-t border-border p-3 flex gap-2 bg-card"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite sua mensagem…"
          autoFocus
        />
        <Button type="submit" disabled={!text.trim() || sendMut.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
