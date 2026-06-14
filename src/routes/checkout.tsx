import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { useStore } from "@/lib/store";
import { formatBRL } from "@/lib/mock-data";
import { createStripeCheckout } from "@/lib/checkout.functions";
import { toast } from "sonner";
import { CreditCard, QrCode, FileText, Lock, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — MercaBrasil" }] }),
  component: Checkout,
});

function Checkout() {
  const cart = useStore((s) => s.cart);
  const clear = useStore((s) => s.clearCart);
  const [method, setMethod] = useState<"pix" | "credit" | "boleto">("credit");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const checkout = useServerFn(createStripeCheckout);

  const handlePay = async () => {
    if (cart.length === 0) return;
    if (method !== "credit") {
      clear();
      setDone(true);
      return;
    }
    try {
      setLoading(true);
      const { url } = await checkout({
        data: {
          origin: window.location.origin,
          items: cart.map((i) => ({ name: i.product.name, image: i.product.image, price: i.product.price, qty: i.qty })),
        },
      });
      if (url) window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao iniciar pagamento");
      setLoading(false);
    }
  };

  const subtotal = cart.reduce((a, i) => a + i.product.price * i.qty, 0);
  const shipping = subtotal > 199 ? 0 : 24.9;
  const pixDiscount = method === "pix" ? subtotal * 0.1 : 0;
  const total = subtotal + shipping - pixDiscount;

  if (done) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16 max-w-md text-center">
          <CheckCircle2 className="h-20 w-20 mx-auto text-success" />
          <h1 className="text-3xl font-black mt-4">Pedido confirmado!</h1>
          <p className="text-muted-foreground mt-2">Você receberá um e-mail com a confirmação e o rastreio.</p>
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
                <Input placeholder="Nome completo" />
                <Input placeholder="CPF" />
                <Input placeholder="CEP" />
                <Input placeholder="Telefone" />
                <Input placeholder="Endereço" className="sm:col-span-2" />
                <Input placeholder="Número" />
                <Input placeholder="Complemento" />
                <Input placeholder="Cidade" />
                <Input placeholder="Estado" />
              </div>
            </Section>

            <Section title="2. Forma de pagamento">
              <div className="grid sm:grid-cols-3 gap-2">
                <PayBtn active={method === "pix"} onClick={() => setMethod("pix")} icon={<QrCode className="h-5 w-5" />} label="PIX (10% OFF)" />
                <PayBtn active={method === "credit"} onClick={() => setMethod("credit")} icon={<CreditCard className="h-5 w-5" />} label="Cartão de crédito" />
                <PayBtn active={method === "boleto"} onClick={() => setMethod("boleto")} icon={<FileText className="h-5 w-5" />} label="Boleto" />
              </div>
              {method === "credit" && (
                <div className="grid sm:grid-cols-2 gap-3 mt-4">
                  <Input placeholder="Número do cartão" className="sm:col-span-2" />
                  <Input placeholder="Nome impresso" className="sm:col-span-2" />
                  <Input placeholder="Validade MM/AA" />
                  <Input placeholder="CVV" />
                </div>
              )}
              {method === "pix" && <div className="mt-4 text-sm text-muted-foreground">Você receberá o QR Code após a confirmação. Pagamento instantâneo.</div>}
              {method === "boleto" && <div className="mt-4 text-sm text-muted-foreground">O boleto será gerado e enviado por e-mail. Compensação em até 2 dias úteis.</div>}
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
                <Row label="Frete" value={shipping === 0 ? "Grátis" : formatBRL(shipping)} />
                {pixDiscount > 0 && <Row label="Desconto PIX" value={`- ${formatBRL(pixDiscount)}`} className="text-success" />}
                <div className="flex justify-between font-black text-lg pt-2"><span>Total</span><span className="text-primary">{formatBRL(total)}</span></div>
              </div>
              <button
                disabled={cart.length === 0 || loading}
                onClick={handlePay}
                className="w-full h-12 rounded-lg bg-gradient-brand text-primary-foreground font-bold flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-50"
              >
                <Lock className="h-4 w-4" /> {loading ? "Redirecionando..." : method === "credit" ? "Pagar com Stripe" : "Pagar agora"}
              </button>
              <div className="text-[11px] text-muted-foreground text-center">Pagamento 100% seguro · Criptografia SSL</div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
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
function PayBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 text-sm font-semibold transition ${active ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"}`}>
      {icon}
      {label}
    </button>
  );
}
function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return <div className={`flex justify-between ${className}`}><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div>;
}
