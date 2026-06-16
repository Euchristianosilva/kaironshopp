import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getSellerFinance } from "@/lib/finance.functions";
import { formatBRL } from "@/lib/mock-data";
import { Wallet, TrendingUp, ArrowDownToLine, Receipt } from "lucide-react";

export const Route = createFileRoute("/seller/finance")({
  head: () => ({ meta: [{ title: "Financeiro do Vendedor — Kairon Shop" }] }),
  component: SellerFinancePage,
});

function SellerFinancePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const fetchFinance = useServerFn(getSellerFinance);
  const { data, isLoading, error } = useQuery({
    queryKey: ["seller-finance"],
    queryFn: () => fetchFinance(),
    enabled: !!user,
  });

  if (loading || isLoading || !user) {
    return (
      <div className="min-h-0">
        
        <main className="flex-1 grid place-items-center text-muted-foreground">Carregando...</main>
        
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-0">
        
        <main className="flex-1 container mx-auto px-4 py-8">
          <p className="text-destructive">{(error as Error).message}</p>
          <Link to="/seller" className="text-primary hover:underline text-sm">← Voltar</Link>
        </main>
        
      </div>
    );
  }

  const available = data?.balance?.available?.reduce((a: number, b: any) => a + b.amount, 0) ?? 0;
  const pending = data?.balance?.pending?.reduce((a: number, b: any) => a + b.amount, 0) ?? 0;

  return (
    <div className="min-h-0">
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 gap-3">
          <h1 className="text-3xl font-black flex items-center gap-2"><Wallet className="h-7 w-7 text-primary" /> Financeiro</h1>
          <Link to="/seller" className="text-sm text-primary hover:underline">← Voltar ao painel</Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Stat label="Saldo disponível" value={formatBRL(available / 100)} icon={<Wallet className="h-4 w-4" />} />
          <Stat label="Saldo pendente" value={formatBRL(pending / 100)} icon={<TrendingUp className="h-4 w-4" />} />
          <Stat label="Total vendido (líquido)" value={formatBRL((data?.totals.net ?? 0) / 100)} icon={<Receipt className="h-4 w-4" />} />
          <Stat label="Comissão paga" value={formatBRL((data?.totals.fee ?? 0) / 100)} icon={<ArrowDownToLine className="h-4 w-4" />} />
        </div>

        <Section title="Vendas recentes">
          {data?.sales.length === 0 ? (
            <Empty text="Sem vendas ainda." />
          ) : (
            <Table
              head={["Data", "Bruto", "Comissão", "Líquido", "Transferência"]}
              rows={(data?.sales ?? []).map((s: any) => [
                new Date(s.created_at).toLocaleDateString("pt-BR"),
                formatBRL(s.gross_cents / 100),
                formatBRL(s.platform_fee_cents / 100),
                <span className="font-semibold text-success">{formatBRL(s.seller_net_cents / 100)}</span>,
                <span className="text-xs text-muted-foreground font-mono">{s.stripe_transfer_id ?? "—"}</span>,
              ])}
            />
          )}
        </Section>

        <Section title="Saques (payouts)">
          {data?.payouts.length === 0 ? (
            <Empty text="Nenhum saque ainda. O Stripe libera os valores automaticamente." />
          ) : (
            <Table
              head={["Data", "Valor", "Status"]}
              rows={(data?.payouts ?? []).map((p: any) => [
                p.arrival_date ? new Date(p.arrival_date).toLocaleDateString("pt-BR") : "-",
                formatBRL(p.amount_cents / 100),
                <span className="text-xs px-2 py-1 rounded bg-success/10 text-success font-semibold">{p.status}</span>,
              ])}
            />
          )}
        </Section>
      </main>
      
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">{icon} {label}</div>
      <div className="text-2xl font-black mt-1">{value}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl mt-6 overflow-hidden">
      <div className="p-5 border-b border-border"><h2 className="font-bold text-lg">{title}</h2></div>
      {children}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="p-10 text-center text-muted-foreground text-sm">{text}</div>;
}
function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40">
          <tr className="text-left">{head.map((h) => <th key={h} className="py-3 px-4 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">{r.map((c, j) => <td key={j} className="py-3 px-4">{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
