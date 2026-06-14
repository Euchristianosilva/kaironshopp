import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getStoreSettings, updateStoreSettings } from "@/lib/store-settings.functions";
import { Truck, MapPin } from "lucide-react";
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
  const [origin, setOrigin] = useState({
    origin_zip: "", origin_state: "", origin_city: "", origin_district: "",
    origin_address: "", origin_number: "", origin_complement: "",
  });

  useEffect(() => {
    if (data) {
      setPolicy(data.shipping_policy ?? "");
      setReturnPol(data.return_policy ?? "");
      setOrigin({
        origin_zip: data.origin_zip ?? "",
        origin_state: data.origin_state ?? "",
        origin_city: data.origin_city ?? "",
        origin_district: data.origin_district ?? "",
        origin_address: data.origin_address ?? "",
        origin_number: data.origin_number ?? "",
        origin_complement: data.origin_complement ?? "",
      });
    }
  }, [data]);

  const mutPol = useMutation({
    mutationFn: () => upd({ data: { shipping_policy: policy, return_policy: returnPol } }),
    onSuccess: () => { toast.success("Políticas salvas"); qc.invalidateQueries({ queryKey: ["store-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutOrigin = useMutation({
    mutationFn: () => upd({ data: origin }),
    onSuccess: () => { toast.success("Endereço de coleta salvo"); qc.invalidateQueries({ queryKey: ["store-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function lookupCep() {
    const cep = origin.origin_zip.replace(/\D/g, "");
    if (cep.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = await r.json();
      if (j.erro) return;
      setOrigin((o) => ({
        ...o,
        origin_state: j.uf ?? o.origin_state,
        origin_city: j.localidade ?? o.origin_city,
        origin_district: j.bairro ?? o.origin_district,
        origin_address: j.logradouro ?? o.origin_address,
      }));
    } catch { /* ignore */ }
  }

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
            <h2 className="font-bold mb-1 flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Endereço de coleta</h2>
            <p className="text-sm text-muted-foreground">
              Informe o endereço de onde seus produtos serão coletados. Esse CEP será usado para calcular o frete via Melhor Envio (conta do marketplace) automaticamente.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs font-semibold">CEP *</label>
              <input
                value={origin.origin_zip}
                onChange={(e) => setOrigin({ ...origin, origin_zip: e.target.value })}
                onBlur={lookupCep}
                placeholder="00000-000"
                className="w-full mt-1 h-10 px-3 rounded-md border border-border bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">UF *</label>
              <input maxLength={2} value={origin.origin_state} onChange={(e) => setOrigin({ ...origin, origin_state: e.target.value.toUpperCase() })} className="w-full mt-1 h-10 px-3 rounded-md border border-border bg-background text-sm uppercase" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold">Cidade *</label>
              <input value={origin.origin_city} onChange={(e) => setOrigin({ ...origin, origin_city: e.target.value })} className="w-full mt-1 h-10 px-3 rounded-md border border-border bg-background text-sm" />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs font-semibold">Endereço *</label>
              <input value={origin.origin_address} onChange={(e) => setOrigin({ ...origin, origin_address: e.target.value })} placeholder="Rua, avenida..." className="w-full mt-1 h-10 px-3 rounded-md border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold">Número</label>
              <input value={origin.origin_number} onChange={(e) => setOrigin({ ...origin, origin_number: e.target.value })} className="w-full mt-1 h-10 px-3 rounded-md border border-border bg-background text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold">Bairro</label>
              <input value={origin.origin_district} onChange={(e) => setOrigin({ ...origin, origin_district: e.target.value })} className="w-full mt-1 h-10 px-3 rounded-md border border-border bg-background text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold">Complemento</label>
              <input value={origin.origin_complement} onChange={(e) => setOrigin({ ...origin, origin_complement: e.target.value })} className="w-full mt-1 h-10 px-3 rounded-md border border-border bg-background text-sm" />
            </div>
          </div>

          <button onClick={() => mutOrigin.mutate()} disabled={mutOrigin.isPending}
            className="h-11 px-5 rounded-lg bg-gradient-brand text-primary-foreground font-semibold disabled:opacity-60">
            {mutOrigin.isPending ? "Salvando..." : "Salvar endereço de coleta"}
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div>
            <h2 className="font-bold mb-1">Políticas</h2>
            <p className="text-sm text-muted-foreground">Textos exibidos na sua loja e no checkout.</p>
          </div>

          <div>
            <label className="text-sm font-semibold">Política de envio</label>
            <textarea value={policy} onChange={(e) => setPolicy(e.target.value)} rows={5}
              placeholder="Ex.: Pedidos são enviados em até 2 dias úteis."
              className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>

          <div>
            <label className="text-sm font-semibold">Política de devolução / troca</label>
            <textarea value={returnPol} onChange={(e) => setReturnPol(e.target.value)} rows={5}
              placeholder="Ex.: Aceitamos devolução em até 7 dias após o recebimento."
              className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>

          <button onClick={() => mutPol.mutate()} disabled={mutPol.isPending}
            className="h-11 px-5 rounded-lg bg-secondary font-semibold disabled:opacity-60">
            {mutPol.isPending ? "Salvando..." : "Salvar políticas"}
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-bold mb-1">Peso e dimensões do produto</h2>
          <p className="text-sm text-muted-foreground">
            O cálculo do frete usa peso, altura, largura e comprimento de cada produto.
            Configure esses campos ao editar cada produto em <Link to="/seller/products" className="text-primary hover:underline">Meus produtos</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
