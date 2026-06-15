import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminUpdateCampaignStatus, listAllAdCampaigns } from "@/lib/ads.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pause, Ban, Play } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/admin/ads")({
  head: () => ({ meta: [{ title: "Admin · Anúncios — MercaBrasil" }] }),
  component: Page,
});

const statusLabel: Record<string, { label: string; variant: any }> = {
  pending_payment: { label: "Aguardando", variant: "secondary" },
  scheduled: { label: "Agendado", variant: "outline" },
  active: { label: "No ar", variant: "default" },
  ended: { label: "Encerrado", variant: "secondary" },
  canceled: { label: "Cancelado", variant: "destructive" },
  refunded: { label: "Reembolsado", variant: "destructive" },
  rejected: { label: "Rejeitado", variant: "destructive" },
};

function Page() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAllAdCampaigns);
  const updateFn = useServerFn(adminUpdateCampaignStatus);

  const { data: campaigns = [], isLoading, error } = useQuery({
    queryKey: ["admin-ad-campaigns"],
    queryFn: () => listFn(),
    retry: false,
  });

  const update = useMutation({
    mutationFn: (vars: { campaignId: string; status: any }) => updateFn({ data: vars }),
    onSuccess: () => {
      toast.success("Atualizado");
      qc.invalidateQueries({ queryKey: ["admin-ad-campaigns"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  return (
    <AdminShell title="Anúncios Patrocinados" description="Campanhas e métricas">
      {error ? (
        <p className="text-destructive">{(error as any).message}</p>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <p className="p-8 text-center text-muted-foreground">Carregando...</p>
          ) : campaigns.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">Nenhuma campanha encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Imp/Cliques</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c: any) => {
                  const s = statusLabel[c.status] ?? { label: c.status, variant: "secondary" };
                  const canPause = c.status === "active" || c.status === "scheduled";
                  const canCancel = c.status !== "ended" && c.status !== "canceled" && c.status !== "refunded";
                  const canResume = c.status === "ended" && new Date(c.ends_at) > new Date();
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-semibold text-sm flex items-center gap-2 max-w-[220px]">
                        {c.products?.image_url && <img src={c.products.image_url} alt="" className="h-8 w-8 rounded object-cover" />}
                        <span className="line-clamp-1">{c.products?.title ?? "—"}</span>
                      </TableCell>
                      <TableCell className="text-xs">{c.sellers?.name ?? "—"}</TableCell>
                      <TableCell className="text-xs">{c.placement === "carousel" ? "Carrossel" : "Card"}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(c.starts_at).toLocaleDateString("pt-BR")} → {new Date(c.ends_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                      <TableCell className="text-right text-xs">
                        {c.metrics.impressions.toLocaleString("pt-BR")} / {c.metrics.clicks.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right font-semibold">R$ {(c.amount_cents / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canPause && (
                            <Button size="sm" variant="ghost" title="Pausar (encerrar)" onClick={() => update.mutate({ campaignId: c.id, status: "ended" })}>
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          {canResume && (
                            <Button size="sm" variant="ghost" title="Reativar" onClick={() => update.mutate({ campaignId: c.id, status: "active" })}>
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {canCancel && (
                            <Button size="sm" variant="ghost" title="Cancelar" onClick={() => confirm("Cancelar esta campanha?") && update.mutate({ campaignId: c.id, status: "canceled" })}>
                              <Ban className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </AdminShell>
  );
}

