import { createFileRoute, notFound } from "@tanstack/react-router";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { products, categories } from "@/lib/mock-data";

export const Route = createFileRoute("/category/$slug")({
  loader: ({ params }) => {
    const cat = categories.find((c) => c.slug === params.slug);
    if (!cat) throw notFound();
    return { cat };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.cat.name ?? "Categoria"} — MercaBrasil` },
      { name: "description", content: `Os melhores produtos de ${loaderData?.cat.name ?? "categoria"} com frete grátis e melhores preços.` },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center">Categoria não encontrada.</div>
  ),
  errorComponent: () => (
    <div className="min-h-screen grid place-items-center">Erro ao carregar categoria.</div>
  ),
  component: CategoryPage,
});

function CategoryPage() {
  const { cat } = Route.useLoaderData();
  const items = products.filter((p) => p.category === cat.slug);
  const display = items.length ? items : products;
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <nav className="text-sm text-muted-foreground mb-4">
          Início / <span className="text-foreground font-semibold">{cat.name}</span>
        </nav>
        <h1 className="text-3xl font-black mb-1">{cat.name}</h1>
        <p className="text-muted-foreground mb-6">{display.length} produtos encontrados</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {display.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
