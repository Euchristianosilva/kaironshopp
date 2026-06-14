import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { listMyAdCampaigns } from "@/lib/ads.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Rocket, Eye, MousePointerClick, Percent } from "lucide-react";

export const Route = createFileRoute("/seller/ads")({
  head: () => ({ meta: [{ title: "Anúncios Patrocinados — MercaBrasil" }] }),
  component: Page,
});

const statusLabel: Record<string, { label: string; variant: any }> = {
  pending_payment: { label: "Aguardando pagamento", variant: "secondary" },
  scheduled: { label: "Agendado", variant: "outline" },
  active: { label: "No ar", variant: "default" },
  ended: { label: "Encerrado", variant: "secondary" },
  canceled: { label: "Cancelado", variant: "destructive" },
  refunded: { label: "Reembolsado", variant: "destructive" },
  rejected: { label: "Rejeitado", variant: "destructive" },
};

function Page() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  const listFn = useServerFn(listMyAdCampaigns);
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["my-ad-campaigns"],
    queryFn: () => listFn(),
    enabled: !!user,
  });

  const totals = campaigns.reduce(
    (acc: any, c: any) => {
      acc.impressions += c.metrics.impressions;
      acc.clicks += c.metrics.clicks;
      acc.spent += c.status === "ended" || c.status === "active" || c.status === "scheduled" ? c.amount_cents : 0;
      return acc;
    },
    { impressions: 0, clicks: 0, spent: 0 },
  );
  const ctr = totals.impressions ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : "0.00";

  if (loading || !user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
          <Rocket className="h-7 w-7 text-primary" /> Anúncios Patrocinados
        </h1>
        <Link
          to="/seller/products"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-gradient-brand text-primary-foreground font-bold text-sm hover:opacity-95"
        >
          <Rocket className="h-4 w-4" /> Turbinar produto
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Eye} label="Impressões" value={totals.impressions.toLocaleString("pt-BR")} />
        <Kpi icon={MousePointerClick} label="Cliques" value={totals.clicks.toLocaleString("pt-BR")} />
        <Kpi icon={Percent} label="CTR" value={`${ctr}%`} />
        <Kpi icon={Rocket} label="Investido" value={`R$ ${(totals.spent / 100).toFixed(2)}`} />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        {isLoading ? (
          <p className="p-8 text-center text-muted-foreground">Carregando...</p>
        ) : campaigns.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">Você ainda não criou nenhum anúncio.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Impressões</TableHead>
                <TableHead className="text-right">Cliques</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c: any) => {
                const s = statusLabel[c.status] ?? { label: c.status, variant: "secondary" };
                const itemCtr = c.metrics.impressions ? ((c.metrics.clicks / c.metrics.impressions) * 100).toFixed(2) : "0.00";
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        {c.products?.image_url && <img src={c.products.image_url} alt="" className="h-8 w-8 rounded object-cover shrink-0" />}
                        <span className="line-clamp-1">{c.products?.title ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{c.placement === "carousel" ? "Carrossel" : "Card"}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(c.starts_at).toLocaleDateString("pt-BR")} → {new Date(c.ends_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                    <TableCell className="text-right">{c.metrics.impressions.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{c.metrics.clicks.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{itemCtr}%</TableCell>
                    <TableCell className="text-right font-semibold whitespace-nowrap">R$ {(c.amount_cents / 100).toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="h-9 w-9 rounded-lg bg-gradient-brand grid place-items-center text-primary-foreground mb-2">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
