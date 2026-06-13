import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { BannerCarousel } from "@/components/marketplace/BannerCarousel";
import { CategoryGrid } from "@/components/marketplace/CategoryGrid";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { products } from "@/lib/mock-data";
import { Flame, TrendingUp, Sparkles, Clock } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MercaBrasil — O marketplace dos brasileiros" },
      { name: "description", content: "Compre eletrônicos, moda, casa, games e mais com frete grátis, parcelamento em 12x e a melhor experiência de compra do Brasil." },
      { property: "og:title", content: "MercaBrasil — Marketplace" },
      { property: "og:description", content: "Milhares de produtos com os melhores preços e frete grátis." },
    ],
  }),
  component: Home,
});

function Showcase({ title, icon: Icon, items }: { title: string; icon: typeof Flame; items: typeof products }) {
  return (
    <section className="container mx-auto px-4 mt-10">
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-2xl font-black flex items-center gap-2">
          <Icon className="h-6 w-6 text-primary" /> {title}
        </h2>
        <a href="#" className="text-sm text-primary font-semibold hover:underline">Ver mais</a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <BannerCarousel />
        <CategoryGrid />

        {/* Flash deals strip */}
        <section className="container mx-auto px-4 mt-10">
          <div className="bg-gradient-brand rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 text-primary-foreground shadow-brand">
            <div>
              <div className="text-xs font-bold tracking-widest uppercase opacity-90">Oferta relâmpago</div>
              <h3 className="text-2xl md:text-3xl font-black mt-1">Termina em 02h 35min</h3>
              <p className="opacity-90 mt-1">Aproveite até 70% OFF em itens selecionados.</p>
            </div>
            <a href="#" className="bg-background text-primary font-bold px-6 py-3 rounded-lg hover:scale-105 transition">
              Ver ofertas
            </a>
          </div>
        </section>

        <Showcase title="Ofertas do dia" icon={Flame} items={products.slice(0, 6)} />
        <Showcase title="Mais vendidos" icon={TrendingUp} items={[...products].sort((a, b) => b.sold - a.sold).slice(0, 6)} />
        <Showcase title="Lançamentos" icon={Sparkles} items={products.slice(6, 12)} />
        <Showcase title="Para você" icon={Clock} items={[...products].reverse().slice(0, 6)} />

        {/* Newsletter */}
        <section className="container mx-auto px-4 mt-16">
          <div className="rounded-2xl bg-card border border-border p-8 md:p-10 text-center">
            <h3 className="text-2xl md:text-3xl font-black">Receba ofertas exclusivas</h3>
            <p className="text-muted-foreground mt-2">Cadastre seu e-mail e ganhe 10% OFF na primeira compra.</p>
            <form className="mt-5 max-w-md mx-auto flex gap-2">
              <input type="email" required placeholder="seu@email.com" className="flex-1 h-11 px-4 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/40 outline-none" />
              <button className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90">
                Cadastrar
              </button>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
