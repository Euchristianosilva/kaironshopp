import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin/AdminShell";
import { listAgents, createAgent, updateAgent, removeAgent } from "@/lib/support.functions";
import { Users, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/support-team")({
  head: () => ({ meta: [{ title: "Equipe de Suporte — Admin" }] }),
  component: AdminTeamPage,
});

const ROLE_LABEL: Record<string, string> = {
  agent: "Atendente",
  supervisor: "Supervisor",
  manager: "Gerente de suporte",
};

function AdminTeamPage() {
  const qc = useQueryClient();
  const list = useServerFn(listAgents);
  const create = useServerFn(createAgent);
  const update = useServerFn(updateAgent);
  const remove = useServerFn(removeAgent);

  const { data } = useQuery({ queryKey: ["support-agents"], queryFn: () => list() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "agent" });

  const createMut = useMutation({
    mutationFn: () => create({ data: form as any }),
    onSuccess: () => {
      toast.success("Atendente adicionado");
      setOpen(false); setForm({ full_name: "", email: "", password: "", role: "agent" });
      qc.invalidateQueries({ queryKey: ["support-agents"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const updateMut = useMutation({
    mutationFn: (p: any) => update({ data: p }),
    onSuccess: () => { toast.success("Atualizado"); qc.invalidateQueries({ queryKey: ["support-agents"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => remove({ data: { agent_id: id } }),
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["support-agents"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const agents = (data as any)?.agents ?? [];

  return (
    <AdminShell title="Equipe de Suporte" description="Gerencie quem pode atender chamados dos vendedores.">
      <div className="flex justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Novo atendente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar atendente</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nome completo" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              <Input type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input type="password" placeholder="Senha (mín. 8 caracteres)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button disabled={createMut.isPending} onClick={() => createMut.mutate()}>
                {createMut.isPending ? "Salvando…" : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {agents.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Users className="h-6 w-6" /> Nenhum atendente cadastrado.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase">
              <tr>
                <th className="text-left p-3">Atendente</th>
                <th className="text-left p-3">Cargo</th>
                <th className="text-left p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a: any) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="p-3 font-semibold">{a.profile?.full_name ?? a.user_id.slice(0, 8)}</td>
                  <td className="p-3">
                    <Select value={a.role} onValueChange={(v) => updateMut.mutate({ agent_id: a.id, role: v })}>
                      <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3">
                    <Select value={a.active ? "1" : "0"} onValueChange={(v) => updateMut.mutate({ agent_id: a.id, active: v === "1" })}>
                      <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Ativo</SelectItem>
                        <SelectItem value="0">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover atendente?")) removeMut.mutate(a.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
