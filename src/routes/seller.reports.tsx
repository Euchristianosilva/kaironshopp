import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getSellerReportData } from "@/lib/store-settings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, Download, BarChart3 } from "lucide-react";
import { formatBRL } from "@/lib/mock-data";

export const Route = createFileRoute("/seller/reports")({
  head: () => ({ meta: [{ title: "Relatórios — Kairon Shop" }] }),
  component: Page,
});

function toCSV(rows: any[], columns: { key: string; label: string; map?: (v: any, row: any) => any }[]) {
  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map((c) => escape(c.label)).join(";");
  const body = rows.map((r) => columns.map((c) => escape(c.map ? c.map(r[c.key], r) : r[c.key])).join(";")).join("\n");
  return "\uFEFF" + head + "\n" + body;
}

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function Page() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);

  const fn = useServerFn(getSellerReportData);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["seller-reports", from, to],
    queryFn: () => fn({ data: { from, to } }),
    enabled: !!user,
  });

  if (loading || !user) return <Shell><p className="text-muted-foreground">Carregando...</p></Shell>;

  const items = data?.items ?? [];
  const orders = data?.orders ?? [];
  const products = data?.products ?? [];
  const totalGross = items.reduce((a: number, i: any) => a + (i.gross_cents ?? 0), 0);
  const totalNet = items.reduce((a: number, i: any) => a + (i.seller_net_cents ?? 0), 0);
  const totalFee = items.reduce((a: number, i: any) => a + (i.platform_fee_cents ?? 0), 0);

  const exportSales = () => download(`vendas_${from}_${to}.csv`, toCSV(items, [
    { key: "created_at", label: "Data", map: (v) => new Date(v).toLocaleString("pt-BR") },
    { key: "order_id", label: "Pedido" },
    { key: "product_title", label: "Produto" },
    { key: "variant_label", label: "Variação" },
    { key: "qty", label: "Qtd" },
    { key: "gross_cents", label: "Bruto (R$)", map: (v) => (v / 100).toFixed(2) },
    { key: "platform_fee_cents", label: "Comissão (R$)", map: (v) => (v / 100).toFixed(2) },
    { key: "seller_net_cents", label: "Líquido (R$)", map: (v) => (v / 100).toFixed(2) },
  ]));

  const exportOrders = () => download(`pedidos_${from}_${to}.csv`, toCSV(orders, [
    { key: "created_at", label: "Data", map: (v) => new Date(v).toLocaleString("pt-BR") },
    { key: "id", label: "Pedido" },
    { key: "gross_cents", label: "Total (R$)", map: (v) => (v / 100).toFixed(2) },
    { key: "payment_status", label: "Pagamento" },
    { key: "fulfillment_status", label: "Status" },
    { key: "carrier", label: "Transportadora" },
    { key: "tracking_code", label: "Rastreio" },
  ]));

  const exportStock = () => download(`estoque_${today}.csv`, toCSV(products, [
    { key: "title", label: "Produto" },
    { key: "price_cents", label: "Preço (R$)", map: (v) => (v / 100).toFixed(2) },
    { key: "stock_qty", label: "Estoque" },
    { key: "min_stock", label: "Estoque mín." },
    { key: "active", label: "Ativo", map: (v) => (v ? "Sim" : "Não") },
  ]));

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-3xl font-black flex items-center gap-2"><BarChart3 className="h-7 w-7 text-primary" /> Relatórios</h1>
        <Link to="/seller" className="text-sm text-primary hover:underline">← Painel</Link>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 mb-6 flex flex-wrap items-end gap-3">
        <div><Label>De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>{isFetching ? "Atualizando..." : "Atualizar"}</Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Stat label="Bruto no período" value={formatBRL(totalGross / 100)} />
        <Stat label="Comissões" value={formatBRL(totalFee / 100)} />
        <Stat label="Líquido" value={formatBRL(totalNet / 100)} highlight />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <ReportCard
          title="Vendas detalhadas"
          desc={`${items.length} itens vendidos no período`}
          onExport={exportSales}
          disabled={!items.length}
        />
        <ReportCard
          title="Pedidos"
          desc={`${orders.length} pedidos no período`}
          onExport={exportOrders}
          disabled={!orders.length}
        />
        <ReportCard
          title="Inventário atual"
          desc={`${products.length} produtos cadastrados`}
          onExport={exportStock}
          disabled={!products.length}
        />
      </div>

      {isLoading && <p className="text-muted-foreground mt-6">Carregando dados...</p>}
    </Shell>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`border rounded-xl p-5 ${highlight ? "bg-primary/5 border-primary/40" : "bg-card border-border"}`}>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-black mt-1">{value}</div>
    </div>
  );
}

function ReportCard({ title, desc, onExport, disabled }: { title: string; desc: string; onExport: () => void; disabled?: boolean }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
      <FileSpreadsheet className="h-8 w-8 text-primary mb-2" />
      <h3 className="font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 flex-1">{desc}</p>
      <Button onClick={onExport} disabled={disabled} variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" /> Exportar CSV
      </Button>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-0">
      
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
      
    </div>
  );
}
