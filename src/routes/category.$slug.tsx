import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { categories } from "@/lib/mock-data";
import { fetchProducts } from "@/lib/products";

export const Route = createFileRoute("/category/$slug")({
  loader: ({ params }) => {
    const cat = categories.find((c) => c.slug === params.slug);
    if (!cat) throw notFound();
    return { cat };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.cat.name ?? "Categoria"} — Kairon Shop` },
      { name: "description", content: `Os melhores produtos de ${loaderData?.cat.name ?? "categoria"} com frete grátis.` },
    ],
  }),
  notFoundComponent: () => <div className="min-h-screen grid place-items-center">Categoria não encontrada.</div>,
  errorComponent: () => <div className="min-h-screen grid place-items-center">Erro ao carregar categoria.</div>,
  component: CategoryPage,
});

function CategoryPage() {
  const { cat } = Route.useLoaderData();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["products", "category", cat.slug],
    queryFn: () => fetchProducts({ category: cat.slug, limit: 60 }),
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <nav className="text-sm text-muted-foreground mb-4">
          Início / <span className="text-foreground font-semibold">{cat.name}</span>
        </nav>
        <h1 className="text-3xl font-black mb-1">{cat.name}</h1>
        <p className="text-muted-foreground mb-6">{isLoading ? "Carregando..." : `${items.length} produtos encontrados`}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-xl bg-card border border-border animate-pulse" />
              ))
            : items.length === 0 ? (
              <div className="col-span-full text-center text-muted-foreground py-16">
                Nenhum produto nesta categoria ainda.
              </div>
            ) : (
              items.map((p) => <ProductCard key={p.id} product={p} />)
            )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
