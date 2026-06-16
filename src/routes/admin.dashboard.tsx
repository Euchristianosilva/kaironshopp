import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminOverview } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Admin — Kairon Shop" }] }),
  component: Page,
});

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Page() {
  const fn = useServerFn(getAdminOverview);
  const { data, isLoading } = useQuery({ queryKey: ["admin-overview-page"], queryFn: () => fn(), staleTime: 30_000 });
  const items = [
    { label: "Usuários", value: data?.users },
    { label: "Vendedores", value: data?.sellers },
    { label: "Produtos ativos", value: (data?.products ?? 0) - (data?.productsInactive ?? 0) },
    { label: "Pedidos hoje", value: data?.ordersToday },
    { label: "Pedidos no mês", value: data?.ordersMonth },
    { label: "Faturamento hoje", value: data ? brl(data.grossToday) : undefined },
    { label: "Faturamento no mês", value: data ? brl(data.grossMonth) : undefined },
    { label: "Comissão no mês", value: data ? brl(data.feeMonth) : undefined },
  ];

  return (
    <AdminShell title="Dashboard" description="Indicadores gerais da plataforma.">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((i) => (
          <div key={i.label} className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground">{i.label}</div>
            <div className="text-2xl font-black mt-1">{isLoading ? "…" : (i.value ?? "—")}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/admin/reports" className="px-4 h-10 inline-flex items-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">Ver relatórios</Link>
        <Link to="/admin/orders" className="px-4 h-10 inline-flex items-center rounded-md border border-border text-sm font-semibold">Pedidos recentes</Link>
      </div>
    </AdminShell>
  );
}
