import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { listSellers, setSellerStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/sellers")({
  head: () => ({ meta: [{ title: "Vendedores — Admin" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(listSellers);
  const update = useServerFn(setSellerStatus);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-sellers"], queryFn: () => fn() });

  const change = async (id: string, status: "pending" | "active" | "suspended") => {
    try { await update({ data: { sellerId: id, status } }); toast.success("Atualizado"); qc.invalidateQueries({ queryKey: ["admin-sellers"] }); }
    catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  return (
    <AdminShell title="Vendedores" description="Aprovar, suspender ou reativar lojas.">
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">Loja</th><th className="text-left p-3">Slug</th><th className="text-left p-3">CEP</th><th className="text-left p-3">Stripe</th><th className="text-left p-3">Status</th><th className="p-3"></th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Carregando…</td></tr>}
            {data?.map((s: any) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-3 font-semibold">{s.name}</td>
                <td className="p-3 text-muted-foreground text-xs">{s.slug ?? "—"}</td>
                <td className="p-3 text-xs">{s.origin_zip ?? "—"}</td>
                <td className="p-3 text-xs">{s.stripe_onboarding_status}</td>
                <td className="p-3"><span className={`text-xs font-semibold ${s.status === "active" ? "text-success" : s.status === "suspended" ? "text-destructive" : "text-muted-foreground"}`}>{s.status}</span></td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-2">
                    {s.status !== "active" && <button onClick={() => change(s.id, "active")} className="text-xs px-2 h-8 rounded-md bg-primary text-primary-foreground">Aprovar</button>}
                    {s.status !== "suspended" && <button onClick={() => change(s.id, "suspended")} className="text-xs px-2 h-8 rounded-md border border-destructive/40 text-destructive">Suspender</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
