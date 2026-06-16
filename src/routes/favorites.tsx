import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { useStore } from "@/lib/store";
import { fetchAllProducts } from "@/lib/products";
import { HeartCrack } from "lucide-react";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "Favoritos — Kairon Shop" }] }),
  component: FavPage,
});

function FavPage() {
  const favIds = useStore((s) => s.favorites);
  const { data: products = [] } = useQuery({
    queryKey: ["products", "all"],
    queryFn: fetchAllProducts,
  });
  const items = products.filter((p) => favIds.includes(p.id));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-6">Meus Favoritos</h1>
        {items.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <HeartCrack className="h-16 w-16 mx-auto text-muted-foreground/40" />
            <h2 className="text-xl font-bold mt-4">Nenhum favorito ainda</h2>
            <Link to="/" className="inline-block mt-6 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold">Explorar produtos</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
