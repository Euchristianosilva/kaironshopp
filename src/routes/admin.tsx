import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { Users, Store, ShoppingBag, DollarSign, Image as ImageIcon, Ticket, Edit, Trash2, Rocket, Truck } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — MercaBrasil" }] }),
  component: Admin,
});

const kpis = [
  { label: "Usuários", value: "24.890", icon: Users },
  { label: "Vendedores", value: "1.245", icon: Store },
  { label: "Pedidos hoje", value: "892", icon: ShoppingBag },
  { label: "Faturamento (mês)", value: "R$ 2.4M", icon: DollarSign },
];

const banners = [
  { id: 1, title: "Mega Promoção Eletrônicos", status: "Ativo", start: "01/06", end: "30/06" },
  { id: 2, title: "Moda em Alta", status: "Ativo", start: "05/06", end: "25/06" },
  { id: 3, title: "Games & Consoles", status: "Ativo", start: "10/06", end: "20/06" },
  { id: 4, title: "Casa & Decoração", status: "Agendado", start: "15/06", end: "30/06" },
  { id: 5, title: "Esportes & Fitness", status: "Ativo", start: "01/06", end: "30/06" },
];

function Admin() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black mb-1">Painel Administrativo</h1>
            <p className="text-muted-foreground">Controle geral da plataforma</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/shipping" className="inline-flex items-center gap-2 px-4 h-10 rounded-md border border-border bg-card font-semibold hover:bg-secondary">
              <Truck className="h-4 w-4" /> Frete (Melhor Envio)
            </Link>
            <Link to="/admin/ads" className="inline-flex items-center gap-2 px-4 h-10 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90">
              <Rocket className="h-4 w-4" /> Anúncios patrocinados
            </Link>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="bg-card border border-border rounded-xl p-5">
              <div className="h-10 w-10 rounded-lg bg-gradient-brand grid place-items-center text-primary-foreground mb-3">
                <k.icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-black">{k.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2"><ImageIcon className="h-4 w-4 text-primary" /> Banner Manager</h2>
              <button className="text-sm px-3 h-9 rounded-md bg-primary text-primary-foreground font-semibold">+ Novo banner</button>
            </div>
            <ul className="space-y-2">
              {banners.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-16 rounded bg-gradient-brand shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{b.title}</div>
                      <div className="text-xs text-muted-foreground">{b.start} → {b.end}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${b.status === "Ativo" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>{b.status}</span>
                    <button className="h-8 w-8 grid place-items-center rounded hover:bg-secondary"><Edit className="h-3.5 w-3.5" /></button>
                    <button className="h-8 w-8 grid place-items-center rounded hover:bg-secondary text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2"><Ticket className="h-4 w-4 text-primary" /> Cupons & Promoções</h2>
              <button className="text-sm px-3 h-9 rounded-md bg-primary text-primary-foreground font-semibold">+ Novo cupom</button>
            </div>
            <ul className="space-y-2">
              {[
                { code: "MERCA10", disc: "10%", uses: 1240 },
                { code: "FRETEGRATIS", disc: "Frete grátis", uses: 890 },
                { code: "BLACKFRIDAY50", disc: "50%", uses: 240 },
                { code: "PRIMEIRA15", disc: "15%", uses: 3200 },
              ].map((c) => (
                <li key={c.code} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <div className="font-mono font-bold">{c.code}</div>
                    <div className="text-xs text-muted-foreground">{c.uses} usos</div>
                  </div>
                  <div className="font-bold text-primary">{c.disc}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mt-6">
          {[
            { t: "Vendas (mês)", v: "R$ 2.4M", sub: "+24% vs mês anterior" },
            { t: "Comissão da plataforma", v: "R$ 192K", sub: "8% sobre vendas" },
            { t: "Produtos mais vendidos", v: "Eletrônicos", sub: "34% do volume" },
          ].map((r) => (
            <div key={r.t} className="bg-gradient-brand text-primary-foreground rounded-xl p-5">
              <div className="text-xs opacity-90">{r.t}</div>
              <div className="text-3xl font-black mt-1">{r.v}</div>
              <div className="text-xs opacity-90 mt-1">{r.sub}</div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
