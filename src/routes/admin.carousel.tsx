import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminReviewPremiumCarousel, listPremiumCarouselRequests } from "@/lib/ads.functions";

export const Route = createFileRoute("/admin/carousel")({
  head: () => ({ meta: [{ title: "Admin · Carrossel Premium — MercaBrasil" }] }),
  component: Page,
});

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  awaiting_payment: { label: "Aguardando pagamento", variant: "secondary" },
  awaiting_approval: { label: "Aguardando aprovação", variant: "outline" },
  approved: { label: "Aprovado", variant: "default" },
  rejected: { label: "Rejeitado", variant: "destructive" },
  removed: { label: "Removido", variant: "secondary" },
};

function Page() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPremiumCarouselRequests);
  const reviewFn = useServerFn(adminReviewPremiumCarousel);

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ["admin-premium-carousel"],
    queryFn: () => listFn(),
    retry: false,
  });

  const review = useMutation({
    mutationFn: (data: { campaignId: string; action: "approve" | "reject" | "remove" }) => reviewFn({ data }),
    onSuccess: () => {
      toast.success("Solicitação atualizada");
      qc.invalidateQueries({ queryKey: ["admin-premium-carousel"] });
      qc.invalidateQueries({ queryKey: ["admin-ad-campaigns"] });
      qc.invalidateQueries({ queryKey: ["sponsored", "carousel"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível atualizar"),
  });

  return (
    <AdminShell title="Carrossel Premium" description="Aprovação dos produtos pagos para o destaque principal da home">
      {error ? (
        <p className="text-destructive">{(error as any).message}</p>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <p className="p-8 text-center text-muted-foreground">Carregando...</p>
          ) : requests.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">Nenhuma solicitação de Carrossel Premium encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Data da contratação</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Valor pago</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r: any) => {
                  const adminStatus = r.metadata?.admin_status ?? (r.status === "active" ? "approved" : r.status === "rejected" ? "rejected" : "awaiting_approval");
                  const status = statusMap[adminStatus] ?? { label: adminStatus, variant: "secondary" as const };
                  const canReview = adminStatus === "awaiting_approval" || r.status === "scheduled";
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold text-sm flex items-center gap-2 max-w-[260px]">
                        {r.products?.image_url && <img src={r.products.image_url} alt="" className="h-10 w-10 rounded object-cover" />}
                        <span className="line-clamp-2">{r.products?.title ?? "—"}</span>
                      </TableCell>
                      <TableCell className="text-sm">{r.sellers?.name ?? "—"}</TableCell>
                      <TableCell className="text-xs">{new Date(r.paid_at ?? r.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(r.starts_at).toLocaleDateString("pt-BR")} → {new Date(r.ends_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right font-semibold">R$ {(Number(r.amount_cents ?? 0) / 100).toFixed(2)}</TableCell>
                      <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canReview && (
                            <Button size="sm" variant="ghost" title="Aprovar" onClick={() => review.mutate({ campaignId: r.id, action: "approve" })}>
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                          {canReview && (
                            <Button size="sm" variant="ghost" title="Rejeitar" onClick={() => review.mutate({ campaignId: r.id, action: "reject" })}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" title="Remover" onClick={() => confirm("Remover este produto do Carrossel Premium?") && review.mutate({ campaignId: r.id, action: "remove" })}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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