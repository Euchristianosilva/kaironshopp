import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminFinance, updateCommission } from "@/lib/finance.functions";
import { formatBRL } from "@/lib/mock-data";
import { toast } from "sonner";
import { DollarSign, TrendingUp, Users, Percent } from "lucide-react";


export const Route = createFileRoute("/admin/finance")({
  head: () => ({ meta: [{ title: "Financeiro Master — Kairon Shop" }] }),
  component: AdminFinancePage,
});

function AdminFinancePage() {
  const fetchData = useServerFn(getAdminFinance);
  const updateComm = useServerFn(updateCommission);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-finance"],
    queryFn: () => fetchData(),
  });

  const [pct, setPct] = useState<string>("");
  useEffect(() => {
    if (data?.settings?.commission_percent != null) setPct(String(data.settings.commission_percent));
  }, [data?.settings?.commission_percent]);

  const saveComm = async () => {
    const v = Number(pct);
    if (Number.isNaN(v)) return toast.error("Valor inválido");
    try {
      await updateComm({ data: { commission_percent: v } });
      toast.success("Comissão atualizada");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    }
  };

  return (
    <AdminShell title="Financeiro" description="Receita, comissões e repasses">
      {isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}
      {error && <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-sm text-destructive">{(error as Error).message}</div>}

      {data && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Stat label="Vendas totais (bruto)" value={formatBRL((data.totals.gross ?? 0) / 100)} icon={<TrendingUp className="h-4 w-4" />} />
            <Stat label="Comissão recebida" value={formatBRL((data.totals.fee ?? 0) / 100)} icon={<Percent className="h-4 w-4" />} />
            <Stat label="Repassado a vendedores" value={formatBRL((data.totals.net ?? 0) / 100)} icon={<Users className="h-4 w-4" />} />
            <Stat label="Pedidos pagos" value={String(data.totals.count ?? 0)} icon={<DollarSign className="h-4 w-4" />} />
          </div>

          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <h2 className="font-bold text-lg mb-3">Comissão da plataforma</h2>
            <div className="flex items-end gap-3 flex-wrap">
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Percentual (%)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={pct}
                  onChange={(e) => setPct(e.target.value)}
                  className="mt-1 h-10 w-32 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <button onClick={saveComm} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm">Salvar</button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Vale para novas vendas. Pedidos já criados mantêm o % original.</p>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border"><h2 className="font-bold text-lg">Histórico de transações pagas</h2></div>
            {data.orders.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">Sem transações ainda.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40">
                    <tr className="text-left">
                      <th className="py-3 px-4 font-semibold">Data</th>
                      <th className="py-3 px-4 font-semibold">Pedido</th>
                      <th className="py-3 px-4 font-semibold">Bruto</th>
                      <th className="py-3 px-4 font-semibold">Comissão</th>
                      <th className="py-3 px-4 font-semibold">Repasse</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((o: any) => (
                      <tr key={o.id} className="border-t border-border">
                        <td className="py-3 px-4">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                        <td className="py-3 px-4 font-mono text-xs">{o.id.slice(0, 8)}</td>
                        <td className="py-3 px-4 font-semibold">{formatBRL(o.gross_cents / 100)}</td>
                        <td className="py-3 px-4 text-primary font-semibold">{formatBRL(o.platform_fee_cents / 100)}</td>
                        <td className="py-3 px-4">{formatBRL((o.gross_cents - o.platform_fee_cents) / 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </AdminShell>
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
