import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin/AdminShell";
import { getReports } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Relatórios — Admin" }] }),
  component: Page,
});

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function exportCsv(rows: any[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(",")].concat(rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = `relatorio-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function Page() {
  const fn = useServerFn(getReports);
  const { data, isLoading } = useQuery({ queryKey: ["admin-reports"], queryFn: () => fn() });

  return (
    <AdminShell title="Relatórios" description="Resumo dos últimos 30 dias.">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <Kpi label="Pedidos" value={data?.total_orders} loading={isLoading} />
        <Kpi label="Pedidos pagos" value={data?.paid_orders} loading={isLoading} />
        <Kpi label="Faturamento" value={data ? brl(data.gross_cents) : undefined} loading={isLoading} />
        <Kpi label="Comissão" value={data ? brl(data.fee_cents) : undefined} loading={isLoading} />
        <Kpi label="Fretes" value={data ? brl(data.shipping_cents) : undefined} loading={isLoading} />
      </div>
      <div className="flex justify-end mb-3">
        <button onClick={() => data && exportCsv(data.rows)} className="px-3 h-9 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Exportar CSV</button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">ID</th><th className="text-left p-3">Status</th><th className="text-left p-3">Pgto</th><th className="text-left p-3">Total</th><th className="text-left p-3">Data</th></tr></thead>
          <tbody>
            {data?.rows.map((o: any) => (
              <tr key={o.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                <td className="p-3 text-xs">{o.status}</td>
                <td className="p-3 text-xs">{o.payment_status}</td>
                <td className="p-3">{Number(o.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

function Kpi({ label, value, loading }: { label: string; value: any; loading: boolean }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-black mt-1">{loading ? "…" : value ?? "—"}</div>
    </div>
  );
}
