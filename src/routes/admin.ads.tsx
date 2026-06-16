import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminUpdateCampaignStatus, listAllAdCampaigns, createManualAdCampaign } from "@/lib/ads.functions";
import { listProducts } from "@/lib/admin.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pause, Ban, Play, Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/ads")({
  head: () => ({ meta: [{ title: "Admin · Anúncios — Kairon Shop" }] }),
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

const PLACEMENTS: { value: string; label: string }[] = [
  { value: "banner_principal", label: "Banner Principal" },
  { value: "destaque_home", label: "Destaque da Home" },
  { value: "patrocinado", label: "Produtos Patrocinados" },
  { value: "vitrine_topo", label: "Primeira Linha da Vitrine" },
  { value: "categoria", label: "Categoria Específica" },
  { value: "busca", label: "Resultado de Busca" },
  { value: "premium", label: "Área Premium" },
  { value: "carousel", label: "Carrossel" },
  { value: "card", label: "Card" },
];
const placementLabel = (v: string) => PLACEMENTS.find((p) => p.value === v)?.label ?? v;

function Page() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAllAdCampaigns);
  const updateFn = useServerFn(adminUpdateCampaignStatus);
  const [showManual, setShowManual] = useState(false);

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
      <div className="flex justify-end mb-3">
        <Button onClick={() => setShowManual(true)}>
          <Plus className="h-4 w-4 mr-1" /> Ativar anúncio manualmente
        </Button>
      </div>

      {showManual && <ManualAdModal onClose={() => setShowManual(false)} />}

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
                  <TableHead>Posição</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Imp./Cliques</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c: any) => {
                  const s = statusLabel[c.status] ?? { label: c.status, variant: "secondary" };
                  const canPause = c.status === "active" || c.status === "scheduled";
                  const canCancel = c.status !== "ended" && c.status !== "canceled" && c.status !== "refunded";
                  const canResume = (c.status === "ended" || c.status === "canceled") && new Date(c.ends_at) > new Date();
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-semibold text-sm flex items-center gap-2 max-w-[220px]">
                        {c.products?.image_url && <img src={c.products.image_url} alt="" className="h-8 w-8 rounded object-cover" />}
                        <span className="line-clamp-1">{c.products?.title ?? "—"}</span>
                      </TableCell>
                      <TableCell className="text-xs">{c.sellers?.name ?? "—"}</TableCell>
                      <TableCell className="text-xs">{placementLabel(c.placement)}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(c.starts_at).toLocaleDateString("pt-BR")} → {new Date(c.ends_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                      <TableCell className="text-right text-xs">
                        {c.metrics.impressions.toLocaleString("pt-BR")} / {c.metrics.clicks.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{c.amount_cents === 0 ? "Manual" : `R$ ${(c.amount_cents / 100).toFixed(2)}`}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canPause && (
                            <Button size="sm" variant="ghost" title="Pausar" onClick={() => update.mutate({ campaignId: c.id, status: "ended" })}>
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          {canResume && (
                            <Button size="sm" variant="ghost" title="Reativar" onClick={() => update.mutate({ campaignId: c.id, status: "active" })}>
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {canCancel && (
                            <Button size="sm" variant="ghost" title="Encerrar" onClick={() => confirm("Encerrar esta campanha?") && update.mutate({ campaignId: c.id, status: "canceled" })}>
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

function ManualAdModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const productsFn = useServerFn(listProducts);
  const createFn = useServerFn(createManualAdCampaign);
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState("");
  const [placement, setPlacement] = useState(PLACEMENTS[0].value);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products-search", search],
    queryFn: () => productsFn({ data: { search: search || undefined } }),
  });

  const mut = useMutation({
    mutationFn: () => createFn({ data: {
      productId,
      placement: placement as any,
      startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
      endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
    } }),
    onSuccess: () => {
      toast.success("Anúncio ativado");
      qc.invalidateQueries({ queryKey: ["admin-ad-campaigns"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-5 w-full max-w-lg space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Ativar anúncio manualmente</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Buscar produto</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Título do produto..." className="h-10 w-full px-3 rounded-md border border-border bg-background text-sm" />
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className="h-10 w-full px-3 rounded-md border border-border bg-background text-sm">
            <option value="">Selecione um produto…</option>
            {products.slice(0, 50).map((p: any) => (
              <option key={p.id} value={p.id}>{p.title} — R$ {Number(p.price).toFixed(2)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Posição do anúncio</label>
          <select value={placement} onChange={(e) => setPlacement(e.target.value)} className="h-10 w-full px-3 rounded-md border border-border bg-background text-sm">
            {PLACEMENTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Início (opcional)</label>
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="h-10 w-full px-3 rounded-md border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Fim (opcional)</label>
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="h-10 w-full px-3 rounded-md border border-border bg-background text-sm" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Sem datas, o anúncio fica ativo por 7 dias a partir de agora.</p>
        <div className="flex gap-2 pt-2">
          <Button className="flex-1" disabled={!productId || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Ativando..." : "Ativar Anúncio"}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}


