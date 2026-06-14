import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Pencil, Trash2, Copy, Eye, Power, Search, ChevronUp, ChevronDown, Rocket } from "lucide-react";
import { formatBRL } from "@/lib/mock-data";
import { Skeleton } from "@/components/ui/skeleton";

export type ProductRow = {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  category_slug: string;
  image_url: string | null;
  stock: number | null;
  min_stock?: number | null;
  is_active: boolean | null;
  free_shipping: boolean | null;
  description: string | null;
};

type SortKey = "title" | "price" | "stock" | "is_active";

type Props = {
  products: ProductRow[];
  loading: boolean;
  onEdit: (p: ProductRow) => void;
  onDelete: (p: ProductRow) => void;
  onToggleActive: (p: ProductRow) => void;
  onDuplicate: (p: ProductRow) => void;
  onBoost?: (p: ProductRow) => void;
};

const PAGE_SIZE = 10;

export function ProductsTable({ products, loading, onEdit, onDelete, onToggleActive, onDuplicate, onBoost }: Props) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "paused" | "low">("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "title", dir: "asc" });
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = products;
    if (q) {
      const lower = q.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(lower) || p.category_slug.toLowerCase().includes(lower));
    }
    if (status === "active") list = list.filter((p) => p.is_active);
    if (status === "paused") list = list.filter((p) => !p.is_active);
    if (status === "low") list = list.filter((p) => (p.stock ?? 0) <= (p.min_stock ?? 0) && (p.min_stock ?? 0) > 0);
    list = [...list].sort((a, b) => {
      const k = sort.key;
      const av: any = k === "is_active" ? (a.is_active ? 1 : 0) : a[k] ?? "";
      const bv: any = k === "is_active" ? (b.is_active ? 1 : 0) : b[k] ?? "";
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [products, q, status, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  return (
    <div className="bg-card border border-border rounded-xl mt-6 overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Buscar produto..."
            className="w-full h-10 pl-9 pr-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}
          className="h-10 px-3 rounded-md border border-border bg-background text-sm outline-none"
        >
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="paused">Pausados</option>
          <option value="low">Estoque baixo</option>
        </select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} resultado(s)</span>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : slice.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground">Nenhum produto encontrado.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40">
              <tr className="text-left">
                <SortableTh label="Produto" k="title" sort={sort} onClick={toggleSort} />
                <th className="py-3 px-4 font-semibold">Categoria</th>
                <SortableTh label="Preço" k="price" sort={sort} onClick={toggleSort} />
                <SortableTh label="Estoque" k="stock" sort={sort} onClick={toggleSort} />
                <SortableTh label="Status" k="is_active" sort={sort} onClick={toggleSort} />
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((p) => {
                const low = (p.stock ?? 0) <= (p.min_stock ?? 0) && (p.min_stock ?? 0) > 0;
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-secondary/20">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-secondary/40 rounded overflow-hidden shrink-0">
                          {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <span className="font-medium line-clamp-1 max-w-[280px]">{p.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{p.category_slug}</td>
                    <td className="py-3 px-4 font-bold">{formatBRL(Number(p.price))}</td>
                    <td className={`py-3 px-4 ${low ? "text-amber-600 font-bold" : ""}`}>{p.stock ?? 0}{low && " ⚠"}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${p.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {p.is_active ? "Ativo" : "Pausado"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex gap-1">
                        <Link to="/product/$id" params={{ id: p.id }} target="_blank" className="p-2 rounded hover:bg-secondary" title="Visualizar"><Eye className="h-4 w-4" /></Link>
                        <button onClick={() => onEdit(p)} className="p-2 rounded hover:bg-secondary" title="Editar"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => onDuplicate(p)} className="p-2 rounded hover:bg-secondary" title="Duplicar"><Copy className="h-4 w-4" /></button>
                        {onBoost && p.is_active && (p.stock ?? 0) > 0 && (
                          <button
                            onClick={() => onBoost(p)}
                            className="p-2 rounded hover:bg-primary/10 text-primary"
                            title="🚀 Turbinar produto"
                          >
                            <Rocket className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => onToggleActive(p)} className="p-2 rounded hover:bg-secondary" title={p.is_active ? "Pausar" : "Ativar"}><Power className="h-4 w-4" /></button>
                        <button
                          onClick={() => { if (confirm(`Excluir "${p.title}"?`)) onDelete(p); }}
                          className="p-2 rounded hover:bg-destructive/10 text-destructive"
                          title="Excluir"
                        ><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="p-3 border-t border-border flex items-center justify-end gap-2 text-sm">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={current === 1} className="h-8 px-3 rounded border border-border disabled:opacity-50">Anterior</button>
          <span className="text-muted-foreground">Página {current} de {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={current === pages} className="h-8 px-3 rounded border border-border disabled:opacity-50">Próxima</button>
        </div>
      )}
    </div>
  );
}

function SortableTh({ label, k, sort, onClick }: { label: string; k: SortKey; sort: { key: SortKey; dir: "asc" | "desc" }; onClick: (k: SortKey) => void }) {
  const active = sort.key === k;
  return (
    <th className="py-3 px-4 font-semibold">
      <button onClick={() => onClick(k)} className="inline-flex items-center gap-1 hover:text-primary">
        {label}
        {active && (sort.dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
    </th>
  );
}
