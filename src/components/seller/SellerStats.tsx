import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/mock-data";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { Package, CheckCircle2, PauseCircle, ShoppingBag, DollarSign, TrendingUp, Star, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Props = { sellerId: string; products: any[] };

export function SellerStats({ sellerId, products }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["seller-stats", sellerId],
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 5);
      since.setDate(1);
      since.setHours(0, 0, 0, 0);

      const [itemsRes, ordersRes] = await Promise.all([
        supabase
          .from("order_items")
          .select("title,qty,unit_price,gross_cents,seller_net_cents,product_id,created_at,order_id")
          .eq("seller_id", sellerId)
          .gte("created_at", since.toISOString()),
        supabase
          .from("orders")
          .select("id,payment_status,status,gross_cents,created_at")
          .eq("seller_id", sellerId),
      ]);
      if (itemsRes.error) throw itemsRes.error;
      if (ordersRes.error) throw ordersRes.error;
      return { items: itemsRes.data ?? [], orders: ordersRes.data ?? [] };
    },
  });

  const active = products.filter((p) => p.is_active).length;
  const paused = products.filter((p) => !p.is_active).length;
  const lowStock = products.filter((p) => (p.stock ?? 0) <= (p.min_stock ?? 0) && (p.min_stock ?? 0) > 0).length;
  const items = data?.items ?? [];
  const orders = data?.orders ?? [];

  const paidOrders = orders.filter((o: any) => o.payment_status === "paid");
  const pendingOrders = orders.filter((o: any) => o.payment_status !== "paid").length;
  const totalRevenueCents = paidOrders.reduce((a: number, o: any) => a + (o.gross_cents ?? 0), 0);
  const avgTicketCents = paidOrders.length ? totalRevenueCents / paidOrders.length : 0;

  // monthly revenue (last 6 months) — from order_items.gross_cents
  const months: { key: string; label: string; revenue: number; orders: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, label: d.toLocaleDateString("pt-BR", { month: "short" }), revenue: 0, orders: 0 });
  }
  const seenOrders = new Set<string>();
  for (const it of items as any[]) {
    const d = new Date(it.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const m = months.find((x) => x.key === key);
    if (m) {
      m.revenue += (it.gross_cents ?? 0) / 100;
      if (!seenOrders.has(it.order_id)) {
        seenOrders.add(it.order_id);
        m.orders += 1;
      }
    }
  }
  const monthRevenueCents = (() => {
    const k = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return (months.find((x) => x.key === k)?.revenue ?? 0) * 100;
  })();

  // top 5 products by gross
  const byProduct = new Map<string, { title: string; gross: number; qty: number }>();
  for (const it of items as any[]) {
    const cur = byProduct.get(it.product_id) ?? { title: it.title, gross: 0, qty: 0 };
    cur.gross += (it.gross_cents ?? 0) / 100;
    cur.qty += it.qty ?? 0;
    byProduct.set(it.product_id, cur);
  }
  const topProducts = Array.from(byProduct.values()).sort((a, b) => b.gross - a.gross).slice(0, 5);

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Ativos" value={String(active)} tone="success" />
        <StatCard icon={<PauseCircle className="h-4 w-4" />} label="Pausados" value={String(paused)} />
        <StatCard icon={<Package className="h-4 w-4" />} label="Catálogo" value={String(products.length)} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Estoque baixo" value={String(lowStock)} tone={lowStock > 0 ? "warn" : "default"} />
        <StatCard icon={<ShoppingBag className="h-4 w-4" />} label="Pedidos pagos" value={String(paidOrders.length)} />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Pedidos pendentes" value={String(pendingOrders)} />
        <StatCard icon={<DollarSign className="h-4 w-4" />} label="Faturamento mês" value={formatBRL(monthRevenueCents / 100)} tone="primary" />
        <StatCard icon={<Star className="h-4 w-4" />} label="Ticket médio" value={formatBRL(avgTicketCents / 100)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Faturamento — últimos 6 meses">
          {isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={months} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: any) => formatBRL(Number(v))}
                />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Top 5 produtos (faturamento)">
          {isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : topProducts.length === 0 ? (
            <div className="h-[220px] grid place-items-center text-sm text-muted-foreground">Sem vendas ainda no período.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                <YAxis type="category" dataKey="title" width={120} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: any) => formatBRL(Number(v))}
                />
                <Bar dataKey="gross" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone = "default" }: { icon: React.ReactNode; label: string; value: string; tone?: "default" | "primary" | "success" | "warn" }) {
  const toneClass =
    tone === "primary" ? "border-primary/30 bg-primary/5"
    : tone === "success" ? "border-success/30 bg-success/5"
    : tone === "warn" ? "border-amber-500/30 bg-amber-500/5"
    : "border-border bg-card";
  return (
    <div className={`rounded-xl p-4 border ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xl font-black mt-1.5">{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-bold mb-3">{title}</h3>
      {children}
    </div>
  );
}
