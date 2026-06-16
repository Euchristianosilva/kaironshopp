import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { listPromotions, upsertPromotion, deletePromotion } from "@/lib/marketing.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/promotions")({
  head: () => ({ meta: [{ title: "Promoções — Kairon Shop" }] }),
  component: Page,
});

function Page() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  const qc = useQueryClient();
  const list = useServerFn(listPromotions);
  const save = useServerFn(upsertPromotion);
  const del = useServerFn(deletePromotion);

  const { data, isLoading } = useQuery({ queryKey: ["promotions"], queryFn: () => list(), enabled: !!user });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const saveMut = useMutation({
    mutationFn: (v: any) => save({ data: v }),
    onSuccess: () => { toast.success("Promoção salva"); qc.invalidateQueries({ queryKey: ["promotions"] }); setOpen(false); setEditing(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Removida"); qc.invalidateQueries({ queryKey: ["promotions"] }); },
  });

  const products = data?.products ?? [];
  const promotions = data?.promotions ?? [];

  if (loading || !user) return <Shell><p className="text-muted-foreground">Carregando...</p></Shell>;

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-3xl font-black flex items-center gap-2"><Sparkles className="h-7 w-7 text-primary" /> Promoções</h1>
        <div className="flex gap-2">
          <Link to="/seller" className="text-sm text-primary hover:underline self-center">← Painel</Link>
          <Button onClick={() => { setEditing(null); setOpen(true); }} disabled={!products.length}><Plus className="h-4 w-4 mr-1" /> Nova promoção</Button>
        </div>
      </div>

      {!products.length && <p className="text-sm text-muted-foreground mb-4">Cadastre um produto antes de criar promoções.</p>}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? <p className="p-8 text-center text-muted-foreground">Carregando...</p>
          : !promotions.length ? <p className="p-8 text-center text-muted-foreground">Nenhuma promoção criada.</p>
          : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nome</TableHead><TableHead>Produto</TableHead><TableHead>Desconto</TableHead>
              <TableHead>Período</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {promotions.map((p: any) => {
                const prod = products.find((x: any) => x.id === p.product_id);
                const ended = new Date(p.ends_at) < new Date();
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold">{p.name}</TableCell>
                    <TableCell className="text-sm">{prod?.title ?? "—"}</TableCell>
                    <TableCell>{p.discount_percent}%</TableCell>
                    <TableCell className="text-xs">
                      {new Date(p.starts_at).toLocaleDateString("pt-BR")} → {new Date(p.ends_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={!p.active ? "secondary" : ended ? "outline" : "default"}>
                        {!p.active ? "Inativa" : ended ? "Expirada" : "Ativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => confirm("Remover promoção?") && delMut.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <PromoDialog open={open} onOpenChange={setOpen} editing={editing} products={products} onSave={(v: any) => saveMut.mutate(v)} saving={saveMut.isPending} />
    </Shell>
  );
}

function PromoDialog({ open, onOpenChange, editing, products, onSave, saving }: any) {
  const [form, setForm] = useState<any>({ product_id: "", name: "", discount_percent: 10, ends_at: "", active: true });
  useEffect(() => {
    if (editing) setForm({
      id: editing.id, product_id: editing.product_id, name: editing.name,
      discount_percent: editing.discount_percent, ends_at: editing.ends_at?.slice(0, 10) ?? "", active: editing.active,
    });
    else setForm({ product_id: products[0]?.id ?? "", name: "", discount_percent: 10, ends_at: "", active: true });
  }, [editing, open, products]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Editar promoção" : "Nova promoção"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Black Friday" /></div>
          <div><Label>Produto</Label>
            <Select value={form.product_id} onValueChange={(v: string) => setForm({ ...form, product_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Desconto (%)</Label><Input type="number" min="1" max="90" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: Number(e.target.value) })} /></div>
            <div><Label>Termina em</Label><Input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
          </div>
          <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><Label>Ativa</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={saving || !form.name || !form.product_id || !form.ends_at} onClick={() => onSave({
            ...form, ends_at: new Date(form.ends_at).toISOString(),
          })}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-0">
      
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
      
    </div>
  );
}
