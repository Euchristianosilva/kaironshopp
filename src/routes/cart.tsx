import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { useStore } from "@/lib/store";
import { formatBRL } from "@/lib/mock-data";
import { Trash2, Plus, Minus, ShoppingBag, Tag, Truck } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Carrinho — MercaBrasil" }] }),
  component: CartPage,
});

function CartPage() {
  const cart = useStore((s) => s.cart);
  const updateQty = useStore((s) => s.updateQty);
  const remove = useStore((s) => s.removeFromCart);
  const [coupon, setCoupon] = useState("");
  const [cep, setCep] = useState("");

  const subtotal = cart.reduce((a, i) => a + i.product.price * i.qty, 0);
  const shipping = subtotal > 199 || cart.length === 0 ? 0 : 24.9;
  const discount = coupon.toUpperCase() === "MERCA10" ? subtotal * 0.1 : 0;
  const total = subtotal + shipping - discount;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-6">Meu Carrinho</h1>

        {cart.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/40" />
            <h2 className="text-xl font-bold mt-4">Seu carrinho está vazio</h2>
            <p className="text-muted-foreground mt-2">Explore nossas ofertas e adicione produtos.</p>
            <Link to="/" className="inline-block mt-6 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90">
              Continuar comprando
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            <div className="space-y-3">
              {cart.map((i) => (
                <div key={i.product.id} className="bg-card border border-border rounded-xl p-4 flex gap-4">
                  <div className="h-24 w-24 rounded-lg bg-secondary/30 overflow-hidden shrink-0">
                    <img src={i.product.image} alt={i.product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to="/product/$id" params={{ id: i.product.id }} className="text-sm font-semibold line-clamp-2 hover:text-primary">
                      {i.product.name}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-1">Vendido por {i.product.seller}</div>
                    <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
                      <div className="flex items-center border border-border rounded-md">
                        <button onClick={() => updateQty(i.product.id, i.qty - 1)} className="h-8 w-8 grid place-items-center hover:bg-secondary"><Minus className="h-3 w-3" /></button>
                        <span className="w-10 text-center font-semibold text-sm">{i.qty}</span>
                        <button onClick={() => updateQty(i.product.id, i.qty + 1)} className="h-8 w-8 grid place-items-center hover:bg-secondary"><Plus className="h-3 w-3" /></button>
                      </div>
                      <button onClick={() => remove(i.product.id)} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                        <Trash2 className="h-3 w-3" /> Remover
                      </button>
                      <div className="font-black text-lg">{formatBRL(i.product.price * i.qty)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <aside className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-bold mb-3 flex items-center gap-2"><Truck className="h-4 w-4" /> Calcular frete</h3>
                <div className="flex gap-2">
                  <input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" className="flex-1 h-10 px-3 rounded-md border border-border bg-background text-sm" />
                  <button className="px-4 h-10 rounded-md bg-secondary font-semibold text-sm hover:bg-secondary/80">OK</button>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-bold mb-3 flex items-center gap-2"><Tag className="h-4 w-4" /> Cupom de desconto</h3>
                <div className="flex gap-2">
                  <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="MERCA10" className="flex-1 h-10 px-3 rounded-md border border-border bg-background text-sm" />
                  <button className="px-4 h-10 rounded-md bg-secondary font-semibold text-sm hover:bg-secondary/80">Aplicar</button>
                </div>
                {discount > 0 && <div className="text-xs text-success mt-2 font-semibold">Cupom aplicado: -10%</div>}
              </div>
              <div className="bg-card border border-border rounded-xl p-5 space-y-2">
                <h3 className="font-bold mb-2">Resumo</h3>
                <Row label="Subtotal" value={formatBRL(subtotal)} />
                <Row label="Frete" value={shipping === 0 ? "Grátis" : formatBRL(shipping)} />
                {discount > 0 && <Row label="Desconto" value={`- ${formatBRL(discount)}`} className="text-success" />}
                <div className="border-t border-border pt-3 mt-2 flex justify-between font-black text-lg">
                  <span>Total</span><span className="text-primary">{formatBRL(total)}</span>
                </div>
                <div className="text-xs text-muted-foreground">ou 12x de {formatBRL(total / 12)} sem juros</div>
                <Link to="/checkout" className="block text-center w-full h-11 rounded-lg bg-gradient-brand text-primary-foreground font-bold leading-[2.75rem] mt-3 hover:opacity-95">
                  Finalizar compra
                </Link>
              </div>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return <div className={`flex justify-between text-sm ${className}`}><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div>;
}
