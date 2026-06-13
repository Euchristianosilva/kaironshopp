import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { DollarSign, ShoppingBag, Package, AlertCircle, TrendingUp, Plus } from "lucide-react";

export const Route = createFileRoute("/seller")({
  head: () => ({ meta: [{ title: "Painel do Vendedor — MercaBrasil" }] }),
  component: Seller,
});

const stats = [
  { label: "Vendas (mês)", value: "R$ 48.290", icon: DollarSign, trend: "+12%", color: "from-primary to-brand-orange" },
  { label: "Pedidos", value: "234", icon: ShoppingBag, trend: "+8%", color: "from-brand-orange to-primary" },
  { label: "Produtos ativos", value: "78", icon: Package, trend: "—", color: "from-primary to-brand-orange" },
  { label: "Esgotados", value: "4", icon: AlertCircle, trend: "Atenção", color: "from-brand-orange to-primary" },
];

const recentOrders = [
  { id: "#10245", buyer: "João S.", product: "Smartphone Galaxy Ultra", value: "R$ 4.299", status: "Aguardando envio" },
  { id: "#10244", buyer: "Maria O.", product: "Fone Bluetooth Premium", value: "R$ 399", status: "Enviado" },
  { id: "#10243", buyer: "Carlos P.", product: "Notebook Gamer RTX", value: "R$ 6.890", status: "Entregue" },
  { id: "#10242", buyer: "Ana L.", product: "Cafeteira Espresso", value: "R$ 1.199", status: "Aguardando envio" },
];

function Seller() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-black">Painel do Vendedor</h1>
            <p className="text-muted-foreground">Bem-vindo de volta, TechStore BR 👋</p>
          </div>
          <button className="h-11 px-5 rounded-lg bg-gradient-brand text-primary-foreground font-semibold flex items-center gap-2 hover:opacity-95">
            <Plus className="h-4 w-4" /> Novo produto
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-5">
              <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${s.color} grid place-items-center text-primary-foreground mb-3`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-black">{s.value}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <span>{s.label}</span>
                <span className="text-success font-semibold ml-auto">{s.trend}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mt-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Vendas dos últimos 7 dias</h2>
              <select className="text-sm border border-border rounded-md h-9 px-2 bg-background">
                <option>Última semana</option><option>Último mês</option>
              </select>
            </div>
            <div className="h-64 flex items-end gap-2">
              {[40, 65, 55, 80, 95, 70, 88].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-gradient-brand rounded-t-md transition-all hover:opacity-80" style={{ height: `${h}%` }} />
                  <span className="text-[10px] text-muted-foreground">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][i]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-bold text-lg mb-4">Top produtos</h2>
            <ul className="space-y-3 text-sm">
              {["Smartphone Galaxy Ultra", "Notebook Gamer RTX", "Fone Premium", "Console Next-Gen"].map((p, i) => (
                <li key={p} className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded bg-gradient-brand grid place-items-center text-primary-foreground font-bold text-xs">{i + 1}</div>
                  <div className="flex-1 truncate">{p}</div>
                  <div className="text-muted-foreground text-xs">{120 - i * 22} vendas</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Pedidos recentes</h2>
            <button className="text-sm text-primary font-semibold hover:underline">Ver todos</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 font-semibold">Pedido</th>
                  <th className="py-2 font-semibold">Cliente</th>
                  <th className="py-2 font-semibold">Produto</th>
                  <th className="py-2 font-semibold">Valor</th>
                  <th className="py-2 font-semibold">Status</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0">
                    <td className="py-3 font-semibold">{o.id}</td>
                    <td className="py-3">{o.buyer}</td>
                    <td className="py-3 truncate max-w-[200px]">{o.product}</td>
                    <td className="py-3 font-bold">{o.value}</td>
                    <td className="py-3"><span className="text-xs px-2 py-1 rounded-full bg-secondary font-semibold">{o.status}</span></td>
                    <td className="py-3 text-right"><button className="text-primary text-xs font-semibold hover:underline">Gerenciar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
