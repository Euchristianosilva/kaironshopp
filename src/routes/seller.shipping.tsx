import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getStoreSettings, updateStoreSettings } from "@/lib/store-settings.functions";
import { Truck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/shipping")({
  head: () => ({ meta: [{ title: "Fretes — Painel do Vendedor" }] }),
  component: Page,
});

function Page() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  const qc = useQueryClient();
  const get = useServerFn(getStoreSettings);
  const upd = useServerFn(updateStoreSettings);
  const { data, isLoading } = useQuery({ queryKey: ["store-settings"], queryFn: () => get(), enabled: !!user });
  const [policy, setPolicy] = useState("");
  const [returnPol, setReturnPol] = useState("");

  useEffect(() => {
    if (data) { setPolicy(data.shipping_policy ?? ""); setReturnPol(data.return_policy ?? ""); }
  }, [data]);

  const mut = useMutation({
    mutationFn: () => upd({ data: { shipping_policy: policy, return_policy: returnPol } }),
    onSuccess: () => { toast.success("Políticas salvas"); qc.invalidateQueries({ queryKey: ["store-settings"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading || isLoading || !user) return (
    <div className="min-h-0">
      <main className="flex-1 grid place-items-center text-muted-foreground">Carregando...</main>
    </div>
  );

  return (
    <div className="min-h-0">
      
      <main className="flex-1 container mx-auto px-4 py-8 space-y-6 max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-black flex items-center gap-2"><Truck className="h-7 w-7 text-primary" /> Fretes e entregas</h1>
          <Link to="/seller" className="text-sm text-primary hover:underline">← Painel</Link>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div>
            <h2 className="font-bold mb-1">Como funciona</h2>
            <p className="text-sm text-muted-foreground">
              O frete pode ser configurado em cada produto (CEP de origem, transportadora, opção de frete grátis e entrega própria).
              Aqui você define as <strong>políticas gerais</strong> exibidas na sua loja e nos checkouts.
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold">Política de envio</label>
            <textarea
              value={policy} onChange={(e) => setPolicy(e.target.value)} rows={6}
              placeholder="Ex.: Pedidos são enviados em até 2 dias úteis via Correios. Prazo médio de entrega: 5 a 10 dias úteis."
              className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Política de devolução / troca</label>
            <textarea
              value={returnPol} onChange={(e) => setReturnPol(e.target.value)} rows={6}
              placeholder="Ex.: Aceitamos devolução em até 7 dias após o recebimento, conforme o Código de Defesa do Consumidor."
              className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
            />
          </div>

          <button onClick={() => mut.mutate()} disabled={mut.isPending}
            className="h-11 px-5 rounded-lg bg-gradient-brand text-primary-foreground font-semibold disabled:opacity-60">
            {mut.isPending ? "Salvando..." : "Salvar políticas"}
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-bold mb-1">Frete por produto</h2>
          <p className="text-sm text-muted-foreground">
            Para configurar peso, dimensões, CEP de origem, transportadora e frete grátis,
            edite cada produto no <Link to="/seller" className="text-primary hover:underline">painel principal</Link>,
            aba <strong>Envio</strong>.
          </p>
        </div>
      </main>
      
    </div>
  );
}
