import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { listCoupons, setCouponActive } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/coupons")({
  head: () => ({ meta: [{ title: "Cupons — Admin" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(listCoupons);
  const toggle = useServerFn(setCouponActive);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-coupons"], queryFn: () => fn() });

  const setActive = async (id: string, active: boolean) => {
    try { await toggle({ data: { id, active } }); qc.invalidateQueries({ queryKey: ["admin-coupons"] }); }
    catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  return (
    <AdminShell title="Cupons" description="Cupons de desconto criados pelos vendedores.">
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">Código</th><th className="text-left p-3">Tipo</th><th className="text-left p-3">Valor</th><th className="text-left p-3">Usos</th><th className="text-left p-3">Válido até</th><th className="text-left p-3">Ativo</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Carregando…</td></tr>}
            {data?.map((c: any) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-mono">{c.code}</td>
                <td className="p-3 text-xs">{c.discount_type}</td>
                <td className="p-3 text-xs">{c.discount_type === "percent" ? `${c.discount_value}%` : `R$ ${Number(c.discount_value).toFixed(2)}`}</td>
                <td className="p-3 text-xs">{c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                <td className="p-3 text-xs text-muted-foreground">{c.valid_until ? new Date(c.valid_until).toLocaleDateString("pt-BR") : "—"}</td>
                <td className="p-3"><input type="checkbox" checked={!!c.active} onChange={(e) => setActive(c.id, e.target.checked)} /></td>
              </tr>
            ))}
            {!isLoading && (!data || data.length === 0) && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-sm">Nenhum cupom criado ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
