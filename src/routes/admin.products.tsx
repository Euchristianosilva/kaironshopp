import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { listProducts, setProductFlags, deleteProduct } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/products")({
  head: () => ({ meta: [{ title: "Produtos — Admin" }] }),
  component: Page,
});

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Page() {
  const [search, setSearch] = useState("");
  const fn = useServerFn(listProducts);
  const flag = useServerFn(setProductFlags);
  const del = useServerFn(deleteProduct);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-products", search], queryFn: () => fn({ data: { search } }) });

  const toggle = async (id: string, patch: { is_active?: boolean; is_featured?: boolean }) => {
    try { await flag({ data: { productId: id, ...patch } }); qc.invalidateQueries({ queryKey: ["admin-products"] }); }
    catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };
  const remove = async (id: string) => {
    if (!confirm("Remover este produto?")) return;
    try { await del({ data: { productId: id } }); toast.success("Produto removido"); qc.invalidateQueries({ queryKey: ["admin-products"] }); }
    catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  return (
    <AdminShell title="Produtos" description="Aprovar, destacar e remover anúncios.">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título..." className="h-10 w-full sm:w-80 px-3 rounded-md border border-border bg-background text-sm mb-4" />
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">Produto</th><th className="text-left p-3">Categoria</th><th className="text-left p-3">Preço</th><th className="text-left p-3">Ativo</th><th className="text-left p-3">Destaque</th><th className="p-3"></th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Carregando…</td></tr>}
            {data?.map((p: any) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">{p.title}</td>
                <td className="p-3 text-xs text-muted-foreground">{p.category_slug}</td>
                <td className="p-3">{brl(p.price)}</td>
                <td className="p-3"><input type="checkbox" checked={!!p.is_active} onChange={(e) => toggle(p.id, { is_active: e.target.checked })} /></td>
                <td className="p-3"><input type="checkbox" checked={!!p.is_featured} onChange={(e) => toggle(p.id, { is_featured: e.target.checked })} /></td>
                <td className="p-3 text-right"><button onClick={() => remove(p.id)} className="text-xs px-2 h-8 rounded-md border border-destructive/40 text-destructive">Excluir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
