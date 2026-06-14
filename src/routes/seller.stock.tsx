import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { listStockMovements, createStockMovement } from "@/lib/stock.functions";
import { Boxes, ArrowDownToLine, ArrowUpFromLine, Pencil, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/stock")({
  head: () => ({ meta: [{ title: "Estoque — Painel do Vendedor" }] }),
  component: Page,
});

function Page() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  const qc = useQueryClient();
  const list = useServerFn(listStockMovements);
  const add = useServerFn(createStockMovement);

  const { data, isLoading } = useQuery({
    queryKey: ["stock"], queryFn: () => list({ data: {} }), enabled: !!user,
  });

  const [productId, setProductId] = useState("");
  const [kind, setKind] = useState<"in" | "out" | "adjust">("in");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");

  const mut = useMutation({
    mutationFn: () => add({ data: { product_id: productId, kind, quantity: Number(quantity), reason } }),
    onSuccess: () => {
      toast.success("Movimentação registrada");
      setQuantity("1"); setReason("");
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["seller-products"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading || isLoading || !user || !data) return (
    <div className="min-h-0">
      <main className="flex-1 grid place-items-center text-muted-foreground">Carregando...</main>
    </div>
  );

  const lowStock = data.products.filter((p: any) => (p.stock ?? 0) <= (p.min_stock ?? 0) && p.is_active);

  return (
    <div className="min-h-0">
      
      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-black flex items-center gap-2"><Boxes className="h-7 w-7 text-primary" /> Estoque</h1>
          <Link to="/seller" className="text-sm text-primary hover:underline">← Painel</Link>
        </div>

        {lowStock.length > 0 && (
          <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-700 font-semibold mb-2">
              <AlertTriangle className="h-4 w-4" /> Produtos com estoque baixo ({lowStock.length})
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {lowStock.slice(0, 5).map((p: any) => (
                <li key={p.id}>• {p.title} — {p.stock} un. (mínimo: {p.min_stock})</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); if (productId) mut.mutate(); }} className="bg-card border border-border rounded-xl p-5 grid md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-muted-foreground">Produto</label>
            <select required value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm">
              <option value="">Selecione...</option>
              {data.products.map((p: any) => (
                <option key={p.id} value={p.id}>{p.title} (estoque: {p.stock ?? 0})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Tipo</label>
            <select value={kind} onChange={(e) => setKind(e.target.value as any)} className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm">
              <option value="in">Entrada</option>
              <option value="out">Saída</option>
              <option value="adjust">Ajuste (define total)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Quantidade</label>
            <input type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm" />
          </div>
          <div className="flex items-end">
            <button disabled={mut.isPending} className="w-full h-10 rounded-md bg-gradient-brand text-primary-foreground font-semibold disabled:opacity-60">
              {mut.isPending ? "Salvando..." : "Registrar"}
            </button>
          </div>
          <div className="md:col-span-5">
            <label className="text-xs font-semibold text-muted-foreground">Motivo (opcional)</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: compra de fornecedor, perda, inventário..." className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm" />
          </div>
        </form>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border font-semibold">Histórico</div>
          {data.movements.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground text-sm">Nenhuma movimentação ainda.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="px-4 py-2">Data</th><th className="px-4 py-2">Produto</th><th className="px-4 py-2">Tipo</th><th className="px-4 py-2 text-right">Qtd</th><th className="px-4 py-2">Motivo</th></tr>
              </thead>
              <tbody>
                {data.movements.map((m: any) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="px-4 py-2 text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-2">{m.products?.title ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold">
                        {m.kind === "in" && <><ArrowDownToLine className="h-3 w-3 text-success" /> Entrada</>}
                        {m.kind === "out" && <><ArrowUpFromLine className="h-3 w-3 text-destructive" /> Saída</>}
                        {m.kind === "adjust" && <><Pencil className="h-3 w-3" /> Ajuste</>}
                        {m.kind === "sale" && <>Venda</>}
                        {m.kind === "return" && <>Devolução</>}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono">{m.quantity}</td>
                    <td className="px-4 py-2 text-muted-foreground">{m.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
      
    </div>
  );
}
