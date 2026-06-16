import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { listCoupons, upsertCoupon, deleteCoupon } from "@/lib/marketing.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TicketPercent, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/coupons")({
  head: () => ({ meta: [{ title: "Cupons — Kairon Shop" }] }),
  component: Page,
});

function Page() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  const qc = useQueryClient();
  const list = useServerFn(listCoupons);
  const save = useServerFn(upsertCoupon);
  const del = useServerFn(deleteCoupon);

  const { data, isLoading } = useQuery({ queryKey: ["coupons"], queryFn: () => list(), enabled: !!user });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const saveMut = useMutation({
    mutationFn: (v: any) => save({ data: v }),
    onSuccess: () => { toast.success("Cupom salvo"); qc.invalidateQueries({ queryKey: ["coupons"] }); setOpen(false); setEditing(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Cupom removido"); qc.invalidateQueries({ queryKey: ["coupons"] }); },
  });

  if (loading || !user) return <Shell><p className="text-muted-foreground">Carregando...</p></Shell>;

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-3xl font-black flex items-center gap-2"><TicketPercent className="h-7 w-7 text-primary" /> Cupons</h1>
        <div className="flex gap-2">
          <Link to="/seller" className="text-sm text-primary hover:underline self-center">← Painel</Link>
          <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Novo cupom</Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? <p className="p-8 text-center text-muted-foreground">Carregando...</p>
          : !data?.length ? <p className="p-8 text-center text-muted-foreground">Nenhum cupom criado ainda.</p>
          : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Código</TableHead><TableHead>Desconto</TableHead><TableHead>Usos</TableHead>
              <TableHead>Validade</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-bold">{c.code}</TableCell>
                  <TableCell>{c.discount_type === "percent" ? `${c.discount_value}%` : `R$ ${(c.discount_value/100).toFixed(2)}`}</TableCell>
                  <TableCell>{c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</TableCell>
                  <TableCell className="text-xs">{c.valid_until ? new Date(c.valid_until).toLocaleDateString("pt-BR") : "Sem prazo"}</TableCell>
                  <TableCell><Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Ativo" : "Inativo"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => confirm("Remover cupom?") && delMut.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CouponDialog open={open} onOpenChange={setOpen} editing={editing} onSave={(v: any) => saveMut.mutate(v)} saving={saveMut.isPending} />
    </Shell>
  );
}

function CouponDialog({ open, onOpenChange, editing, onSave, saving }: any) {
  const [form, setForm] = useState<any>({
    code: "", discount_type: "percent", discount_value: 10, min_purchase_cents: 0,
    max_uses: "", valid_until: "", active: true,
  });
  useEffect(() => {
    if (editing) setForm({
      id: editing.id, code: editing.code, discount_type: editing.discount_type,
      discount_value: editing.discount_value, min_purchase_cents: editing.min_purchase_cents,
      max_uses: editing.max_uses ?? "", valid_until: editing.valid_until ? editing.valid_until.slice(0, 10) : "",
      active: editing.active,
    });
    else setForm({ code: "", discount_type: "percent", discount_value: 10, min_purchase_cents: 0, max_uses: "", valid_until: "", active: true });
  }, [editing, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Editar cupom" : "Novo cupom"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Código</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="PROMO10" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tipo</Label>
              <Select value={form.discount_type} onValueChange={(v: string) => setForm({ ...form, discount_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Porcentagem</SelectItem>
                  <SelectItem value="fixed">Valor fixo (centavos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Valor</Label><Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Compra mínima (centavos)</Label><Input type="number" value={form.min_purchase_cents} onChange={(e) => setForm({ ...form, min_purchase_cents: Number(e.target.value) })} /></div>
            <div><Label>Usos máximos</Label><Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="ilimitado" /></div>
          </div>
          <div><Label>Válido até</Label><Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></div>
          <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><Label>Ativo</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={saving || !form.code} onClick={() => onSave({
            ...form,
            max_uses: form.max_uses === "" ? null : Number(form.max_uses),
            valid_until: form.valid_until || null,
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
