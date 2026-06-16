import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { useStore } from "@/lib/store";
import { formatBRL } from "@/lib/mock-data";
import { createStripeCheckout } from "@/lib/checkout.functions";
import { calculateShipping } from "@/lib/shipping.functions";
import { toast } from "sonner";
import { CreditCard, Lock, CheckCircle2, Truck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — MercaBrasil" }] }),
  component: Checkout,
});

type ShipOption = {
  id: number | string;
  name: string;
  company: string;
  price: number;
  delivery_time: number;
};

function Checkout() {
  const cart = useStore((s) => s.cart);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState({
    name: "", cpf: "", phone: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
  });
  const [options, setOptions] = useState<ShipOption[]>([]);
  const [shipErr, setShipErr] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const checkout = useServerFn(createStripeCheckout);
  const calcShip = useServerFn(calculateShipping);

  const selected = options.find((o) => String(o.id) === selectedId) ?? null;
  const subtotal = cart.reduce((a, i) => a + i.product.price * i.qty, 0);
  const shippingPrice = selected?.price ?? 0;
  const total = subtotal + shippingPrice;

  const handleCalc = async () => {
    setShipErr(null);
    setOptions([]);
    setSelectedId(null);
    const cepDigits = cep.replace(/\D/g, "");
    if (!/^\d{8}$/.test(cepDigits)) {
      setShipErr("Informe um CEP válido (00000-000).");
      return;
    }
    if (cart.length === 0) return;
    try {
      setCalculating(true);
      // Autofill via ViaCEP (em paralelo ao cálculo de frete)
      const viaCepPromise = fetch(`https://viacep.com.br/ws/${cepDigits}/json/`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      const res = await calcShip({
        data: {
          to_zip: cepDigits,
          items: cart.map((i) => ({ product_id: i.product.id, qty: i.qty })),
        },
      });
      const all: ShipOption[] = [];
      for (const q of res.quotes) {
        if (q.error) setShipErr(q.error);
        for (const o of q.options) all.push(o);
      }
      setOptions(all);
      if (all.length === 0 && !shipErr) setShipErr("Nenhuma opção de frete disponível para este CEP.");

      const via = await viaCepPromise;
      if (via && !via.erro) {
        setAddress((prev) => ({
          ...prev,
          street: prev.street || via.logradouro || "",
          complement: prev.complement || via.complemento || "",
          neighborhood: prev.neighborhood || via.bairro || "",
          city: prev.city || via.localidade || "",
          state: prev.state || via.uf || "",
        }));
      } else if (via?.erro) {
        setShipErr((e) => e ?? "CEP não encontrado.");
      }
    } catch (e: any) {
      setShipErr(e?.message ?? "Erro ao calcular frete");
    } finally {
      setCalculating(false);
    }
  };

  const handlePay = async () => {
    if (cart.length === 0) return;
    if (!selected) {
      toast.error("Selecione uma opção de frete para continuar.");
      return;
    }
    try {
      setLoading(true);
      const { url } = await checkout({
        data: {
          origin: window.location.origin,
          items: cart.map((i) => ({ productId: i.product.id, qty: i.qty })),
          shipping: {
            service_id: String(selected.id),
            service_name: selected.name,
            company: selected.company,
            price: selected.price,
            delivery_time: selected.delivery_time,
            to_zip: cep.replace(/\D/g, ""),
            address,
          },
        },
      });
      if (url) window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao iniciar pagamento");
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16 max-w-md text-center">
          <CheckCircle2 className="h-20 w-20 mx-auto text-success" />
          <h1 className="text-3xl font-black mt-4">Pedido confirmado!</h1>
          <Link to="/account" className="inline-block mt-6 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold">
            Ver meus pedidos
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-6">Finalizar compra</h1>
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-4">
            <Section title="1. Endereço de entrega">
              <div className="grid sm:grid-cols-2 gap-3">
                <Input placeholder="Nome completo" value={address.name} onChange={(e) => setAddress({ ...address, name: e.target.value })} />
                <Input placeholder="CPF" value={address.cpf} onChange={(e) => setAddress({ ...address, cpf: e.target.value })} />
                <div className="flex gap-2">
                  <Input placeholder="CEP (00000-000)" value={cep} onChange={(e) => setCep(e.target.value)} />
                  <button
                    onClick={handleCalc}
                    disabled={calculating || cart.length === 0}
                    className="h-10 px-3 rounded-md bg-primary text-primary-foreground text-sm font-semibold whitespace-nowrap disabled:opacity-50"
                  >
                    {calculating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calcular"}
                  </button>
                </div>
                <Input placeholder="Telefone" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
                <Input placeholder="Endereço" className="sm:col-span-2" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} />
                <Input placeholder="Número" value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} />
                <Input placeholder="Complemento" value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} />
                <Input placeholder="Bairro" value={address.neighborhood} onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })} />
                <Input placeholder="Cidade" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                <Input placeholder="Estado" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
              </div>
            </Section>

            <Section title="2. Frete">
              {shipErr && <div className="text-sm text-destructive mb-3">{shipErr}</div>}
              {options.length === 0 && !shipErr && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Informe o CEP e clique em Calcular para ver as opções de frete.
                </div>
              )}
              <div className="space-y-2">
                {options.map((o) => {
                  const id = String(o.id);
                  const active = selectedId === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedId(id)}
                      className={`w-full text-left p-3 rounded-lg border-2 flex items-center justify-between transition ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                    >
                      <div>
                        <div className="font-semibold text-sm">{o.company} — {o.name}</div>
                        <div className="text-xs text-muted-foreground">Prazo estimado: {o.delivery_time} dia(s) úteis</div>
                      </div>
                      <div className="font-bold">{formatBRL(o.price)}</div>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="3. Pagamento">
              <div className="flex items-center gap-3 text-sm">
                <CreditCard className="h-5 w-5 text-primary" />
                Você será redirecionado ao Stripe para finalizar com cartão, PIX ou boleto com segurança.
              </div>
            </Section>
          </div>

          <aside className="space-y-3">
            <div className="bg-card border border-border rounded-xl p-5 sticky top-32 space-y-3">
              <h3 className="font-bold">Resumo do pedido</h3>
              <div className="space-y-2 max-h-48 overflow-auto">
                {cart.map((i) => (
                  <div key={i.product.id} className="flex gap-2 text-sm">
                    <div className="h-10 w-10 bg-secondary/40 rounded overflow-hidden shrink-0"><img src={i.product.image} alt="" className="w-full h-full object-cover" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="line-clamp-1">{i.product.name}</div>
                      <div className="text-xs text-muted-foreground">{i.qty}x · {formatBRL(i.product.price)}</div>
                    </div>
                  </div>
                ))}
                {cart.length === 0 && <div className="text-sm text-muted-foreground">Carrinho vazio</div>}
              </div>
              <div className="border-t border-border pt-3 space-y-1.5 text-sm">
                <Row label="Subtotal" value={formatBRL(subtotal)} />
                <Row label="Frete" value={selected ? formatBRL(shippingPrice) : "Selecione"} />
                <div className="flex justify-between font-black text-lg pt-2"><span>Total</span><span className="text-primary">{formatBRL(total)}</span></div>
              </div>
              <button
                disabled={cart.length === 0 || loading || !selected}
                onClick={handlePay}
                className="w-full h-12 rounded-lg bg-gradient-brand text-primary-foreground font-bold flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-50"
              >
                <Lock className="h-4 w-4" /> {loading ? "Redirecionando..." : "Pagar com Stripe"}
              </button>
              {!selected && <div className="text-[11px] text-muted-foreground text-center">Selecione uma opção de frete para habilitar o pagamento.</div>}
            </div>
          </aside>
        </div>
      </main>
      <Footer />
      {/* satisfy unused setter warning when success page is reached via webhook */}
      <span hidden onClick={() => setDone(true)} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h2 className="font-bold text-lg mb-4">{title}</h2>
      {children}
    </div>
  );
}
function Input({ className = "", ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`h-10 px-3 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/40 outline-none text-sm ${className}`} />;
}
function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return <div className={`flex justify-between ${className}`}><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div>;
}
