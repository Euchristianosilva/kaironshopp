import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminOverview, getAdminSalesSeries } from "@/lib/admin.functions";
import {
  Users, Store, ShoppingBag, DollarSign, Package, TrendingUp, Percent, BarChart3,
  ArrowUpRight, ArrowDownRight, Plus, Ticket, Image as ImageIcon, Tags, Megaphone,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Painel Admin — MercaBrasil" }] }),
  component: AdminHubPage,
});

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type RangeKey = "today" | "7d" | "30d" | "12m";
const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "today", label: "Hoje", days: 1 },
  { key: "7d", label: "7 dias", days: 7 },
  { key: "30d", label: "30 dias", days: 30 },
  { key: "12m", label: "12 meses", days: 365 },
];

function AdminHubPage() {
  return (
    <AdminShell title="Dashboard" description="Visão geral da plataforma">
      <DashboardContent />
    </AdminShell>
  );
}

function DashboardContent() {
  const fetchOverview = useServerFn(getAdminOverview);
  const fetchSeries = useServerFn(getAdminSalesSeries);
  const [range, setRange] = useState<RangeKey>("30d");
  const days = RANGES.find((r) => r.key === range)!.days;

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview(),
    staleTime: 30_000,
  });

  const { data: series, isLoading: seriesLoading } = useQuery({
    queryKey: ["admin-sales-series", days],
    queryFn: () => fetchSeries({ data: { days } }),
    staleTime: 30_000,
  });

  const kpis = [
    {
      label: "Faturamento (mês)",
      value: data ? formatBRL(data.grossMonth) : "—",
      icon: DollarSign,
      delta: data?.growth ?? null,
      accent: "from-emerald-500 to-teal-500",
    },
    {
      label: "Pedidos (mês)",
      value: data ? data.ordersMonth.toLocaleString("pt-BR") : "—",
      icon: ShoppingBag,
      sub: data ? `${data.ordersToday} hoje` : undefined,
      accent: "from-blue-500 to-cyan-500",
    },
    {
      label: "Usuários",
      value: data ? data.users.toLocaleString("pt-BR") : "—",
      icon: Users,
      accent: "from-violet-500 to-purple-500",
    },
    {
      label: "Produtos ativos",
      value: data ? (data.products - data.productsInactive).toLocaleString("pt-BR") : "—",
      icon: Package,
      sub: data ? `${data.productsInactive} inativos` : undefined,
      accent: "from-rose-500 to-red-500",
    },
    {
      label: "Vendedores",
      value: data ? data.sellers.toLocaleString("pt-BR") : "—",
      icon: Store,
      accent: "from-indigo-500 to-blue-500",
    },
    {
      label: "Comissão (mês)",
      value: data ? formatBRL(data.feeMonth) : "—",
      icon: Percent,
      accent: "from-amber-500 to-orange-500",
    },
  ];

  const quickActions: Array<{ to: string; label: string; icon: any }> = [
    { to: "/admin/coupons", label: "Novo cupom", icon: Ticket },
    { to: "/admin/banners", label: "Novo banner", icon: ImageIcon },
    { to: "/admin/sellers", label: "Aprovar vendedor", icon: Store },
    { to: "/admin/categories", label: "Criar categoria", icon: Tags },
    { to: "/admin/ads", label: "Nova campanha", icon: Megaphone },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-sm text-destructive">
          Erro ao carregar dados: {(error as Error).message}
        </div>
      )}

      {/* KPI Cards */}
      <section aria-label="Indicadores" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow min-w-0"
          >
            <div className="flex items-start justify-between gap-2">
              <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${k.accent} grid place-items-center text-white shadow-sm shrink-0`}>
                <k.icon className="h-4 w-4" />
              </div>
              {k.delta != null && (
                <span
                  className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                    k.delta >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {k.delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(k.delta).toFixed(1)}%
                </span>
              )}
            </div>
            <div className="text-lg sm:text-xl font-black truncate mt-3">
              {isLoading && !data ? "…" : k.value}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5 truncate">{k.label}</div>
            {k.sub && <div className="text-[11px] text-muted-foreground/80 mt-1 truncate">{k.sub}</div>}
          </div>
        ))}
      </section>

      {/* Quick actions */}
      <section aria-label="Ações rápidas" className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Ações rápidas</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <Link
              key={a.to}
              to={a.to as any}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background hover:bg-muted hover:border-primary/40 text-sm font-semibold transition"
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
              <a.icon className="h-3.5 w-3.5 text-muted-foreground" />
              {a.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Charts */}
      <section aria-label="Gráficos" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4 sm:p-5 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="min-w-0">
              <h2 className="font-bold truncate">Receita por dia</h2>
              <p className="text-xs text-muted-foreground">Pedidos pagos no período</p>
            </div>
            <div className="inline-flex items-center rounded-lg bg-muted p-0.5 text-xs">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    range === r.key ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 w-full">
            {seriesLoading && !series ? (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">Carregando gráfico...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series?.series ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v.slice(5)}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={50} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: any) => [`R$ ${Number(v).toFixed(2)}`, "Receita"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 min-w-0">
          <div className="mb-4">
            <h2 className="font-bold">Pedidos por dia</h2>
            <p className="text-xs text-muted-foreground">Volume no período</p>
          </div>
          <div className="h-64 w-full">
            {seriesLoading && !series ? (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series?.series ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v.slice(5)}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={30} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="orders" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* New users + summary */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4 sm:p-5 min-w-0">
          <div className="mb-4">
            <h2 className="font-bold">Novos usuários</h2>
            <p className="text-xs text-muted-foreground">Cadastros por dia</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series?.series ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={30} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="users" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 min-w-0">
          <h2 className="font-bold mb-3">Resumo rápido</h2>
          <ul className="space-y-2.5 text-sm">
            <SummaryRow icon={DollarSign} label="Faturamento hoje" value={data ? formatBRL(data.grossToday) : "—"} />
            <SummaryRow icon={ShoppingBag} label="Pedidos hoje" value={data ? String(data.ordersToday) : "—"} />
            <SummaryRow icon={TrendingUp} label="Receita do mês" value={data ? formatBRL(data.grossMonth) : "—"} />
            <SummaryRow icon={Percent} label="Comissão acumulada" value={data ? formatBRL(data.feeMonth) : "—"} />
            <SummaryRow icon={BarChart3} label="Total de pedidos" value={data ? String(data.ordersMonth) : "—"} />
          </ul>
        </div>
      </section>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-2 py-1.5 border-b border-border/60 last:border-0">
      <span className="flex items-center gap-2 text-muted-foreground min-w-0">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <span className="font-bold truncate">{value}</span>
    </li>
  );
}
