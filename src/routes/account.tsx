import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { User, Package, Heart, MapPin, CreditCard, Bell, Star, LogOut } from "lucide-react";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Minha conta — MercaBrasil" }] }),
  component: Account,
});

const sections = [
  { id: "orders", label: "Meus pedidos", icon: Package },
  { id: "wishlist", label: "Lista de desejos", icon: Heart },
  { id: "addresses", label: "Endereços", icon: MapPin },
  { id: "cards", label: "Cartões salvos", icon: CreditCard },
  { id: "reviews", label: "Avaliações", icon: Star },
  { id: "notifications", label: "Notificações", icon: Bell },
] as const;

const mockOrders = [
  { id: "#10245", date: "12/06/2026", total: "R$ 4.299,00", status: "A caminho", color: "text-warning" },
  { id: "#10198", date: "02/06/2026", total: "R$ 289,00", status: "Entregue", color: "text-success" },
  { id: "#10122", date: "20/05/2026", total: "R$ 1.199,00", status: "Entregue", color: "text-success" },
  { id: "#10088", date: "10/05/2026", total: "R$ 549,00", status: "Cancelado", color: "text-muted-foreground" },
];

function Account() {
  const [tab, setTab] = useState<(typeof sections)[number]["id"]>("orders");
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          <aside className="bg-card border border-border rounded-xl p-4 h-fit sticky top-32">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="h-12 w-12 rounded-full bg-gradient-brand grid place-items-center text-primary-foreground font-black">JS</div>
              <div>
                <div className="font-bold text-sm">João Silva</div>
                <div className="text-xs text-muted-foreground">joao@email.com</div>
              </div>
            </div>
            <nav className="mt-3 space-y-1">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setTab(s.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${tab === s.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                >
                  <s.icon className="h-4 w-4" /> {s.label}
                </button>
              ))}
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-secondary text-muted-foreground mt-2">
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </nav>
          </aside>

          <section className="bg-card border border-border rounded-xl p-6">
            {tab === "orders" && (
              <>
                <h1 className="text-2xl font-black mb-4">Meus pedidos</h1>
                <div className="space-y-3">
                  {mockOrders.map((o) => (
                    <div key={o.id} className="border border-border rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="font-bold">{o.id}</div>
                        <div className="text-xs text-muted-foreground">Pedido em {o.date}</div>
                      </div>
                      <div className={`text-sm font-semibold ${o.color}`}>{o.status}</div>
                      <div className="font-black">{o.total}</div>
                      <button className="text-sm text-primary font-semibold hover:underline">Detalhes</button>
                    </div>
                  ))}
                </div>
              </>
            )}
            {tab !== "orders" && (
              <div className="text-center py-16">
                <User className="h-12 w-12 mx-auto text-muted-foreground/40" />
                <h2 className="text-xl font-bold mt-3">{sections.find((s) => s.id === tab)?.label}</h2>
                <p className="text-muted-foreground mt-1">Seção em desenvolvimento.</p>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
