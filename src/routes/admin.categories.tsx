import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { listCategories, upsertCategory, deleteCategory } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({ meta: [{ title: "Categorias — Admin" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(listCategories);
  const save = useServerFn(upsertCategory);
  const del = useServerFn(deleteCategory);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-categories"], queryFn: () => fn() });
  const [form, setForm] = useState({ id: "", name: "", slug: "", parent_id: "", position: 0, is_active: true });

  const reset = () => setForm({ id: "", name: "", slug: "", parent_id: "", position: 0, is_active: true });
  const submit = async () => {
    try {
      await save({ data: { id: form.id || undefined, name: form.name, slug: form.slug, parent_id: form.parent_id || null, position: Number(form.position) || 0, is_active: form.is_active } });
      toast.success("Salvo"); reset(); qc.invalidateQueries({ queryKey: ["admin-categories"] });
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir categoria? Subcategorias serão excluídas em cascata.")) return;
    try { await del({ data: { id } }); qc.invalidateQueries({ queryKey: ["admin-categories"] }); }
    catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  return (
    <AdminShell title="Categorias" description="Criar, editar e organizar departamentos.">
      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">Nome</th><th className="text-left p-3">Slug</th><th className="text-left p-3">Pai</th><th className="text-left p-3">Pos</th><th className="text-left p-3">Ativa</th><th className="p-3"></th></tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Carregando…</td></tr>}
              {data?.map((c: any) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3 font-semibold">{c.name}</td>
                  <td className="p-3 text-xs text-muted-foreground">{c.slug}</td>
                  <td className="p-3 text-xs">{c.parent_id ? data.find((x: any) => x.id === c.parent_id)?.name ?? "—" : "—"}</td>
                  <td className="p-3 text-xs">{c.position}</td>
                  <td className="p-3 text-xs">{c.is_active ? "Sim" : "Não"}</td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-2">
                      <button onClick={() => setForm({ id: c.id, name: c.name, slug: c.slug, parent_id: c.parent_id ?? "", position: c.position, is_active: c.is_active })} className="text-xs px-2 h-8 rounded-md border border-border">Editar</button>
                      <button onClick={() => remove(c.id)} className="text-xs px-2 h-8 rounded-md border border-destructive/40 text-destructive">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 h-fit">
          <h3 className="font-bold mb-3">{form.id ? "Editar categoria" : "Nova categoria"}</h3>
          <div className="space-y-2">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome" className="h-10 w-full px-3 rounded-md border border-border bg-background text-sm" />
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} placeholder="slug-da-categoria" className="h-10 w-full px-3 rounded-md border border-border bg-background text-sm" />
            <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })} className="h-10 w-full px-3 rounded-md border border-border bg-background text-sm">
              <option value="">— Sem pai —</option>
              {data?.filter((c: any) => c.id !== form.id).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} placeholder="Posição" className="h-10 w-full px-3 rounded-md border border-border bg-background text-sm" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Ativa</label>
            <div className="flex gap-2 pt-2">
              <button onClick={submit} className="flex-1 h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold">{form.id ? "Salvar" : "Criar"}</button>
              {form.id && <button onClick={reset} className="h-10 px-3 rounded-md border border-border text-sm">Cancelar</button>}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
