import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { products, formatBRL } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { Star, Heart, ShoppingCart, Truck, ShieldCheck, RotateCcw, Store, MessageCircle, Minus, Plus } from "lucide-react";

export const Route = createFileRoute("/product/$id")({
  loader: ({ params }) => {
    const product = products.find((p) => p.id === params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.product.name ?? "Produto"} — MercaBrasil` },
      { name: "description", content: loaderData?.product.name ?? "" },
      { property: "og:image", content: loaderData?.product.image ?? "" },
    ],
  }),
  notFoundComponent: () => <div className="min-h-screen grid place-items-center">Produto não encontrado.</div>,
  errorComponent: () => <div className="min-h-screen grid place-items-center">Erro ao carregar.</div>,
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const [qty, setQty] = useState(1);
  const addToCart = useStore((s) => s.addToCart);
  const toggleFav = useStore((s) => s.toggleFavorite);
  const isFav = useStore((s) => s.favorites.includes(product.id));
  const discount = product.oldPrice ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : 0;
  const related = products.filter((p) => p.id !== product.id).slice(0, 6);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6">
        <nav className="text-sm text-muted-foreground mb-4">
          <Link to="/" className="hover:text-primary">Início</Link> /{" "}
          <Link to="/category/$slug" params={{ slug: product.category }} className="hover:text-primary capitalize">
            {product.category}
          </Link>{" "}
          / <span className="text-foreground font-semibold">{product.name.slice(0, 40)}…</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_1fr_320px] gap-6">
          {/* Gallery */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="aspect-square bg-secondary/30 rounded-lg overflow-hidden">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            </div>
            <div className="grid grid-cols-5 gap-2 mt-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="aspect-square bg-secondary/30 rounded border border-border hover:border-primary cursor-pointer overflow-hidden">
                  <img src={product.image} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="text-xs text-muted-foreground">Novo · {product.sold.toLocaleString("pt-BR")} vendidos</div>
            <h1 className="text-2xl font-bold mt-1">{product.name}</h1>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < Math.round(product.rating) ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <span className="font-semibold">{product.rating}</span>
              <span className="text-muted-foreground">(234 avaliações)</span>
            </div>

            <div className="mt-5">
              {product.oldPrice && (
                <div className="text-sm text-muted-foreground line-through">{formatBRL(product.oldPrice)}</div>
              )}
              <div className="flex items-baseline gap-3">
                <div className="text-4xl font-black">{formatBRL(product.price)}</div>
                {discount > 0 && (
                  <span className="text-success font-bold">{discount}% OFF</span>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                ou 12x de {formatBRL(product.price / 12)} sem juros
              </div>
              <div className="mt-1 text-sm font-semibold text-primary">PIX: {formatBRL(product.price * 0.9)} (10% OFF)</div>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center gap-2 text-success font-semibold">
                <Truck className="h-4 w-4" /> Frete grátis para todo o Brasil
              </div>
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Garantia de 12 meses do fabricante</div>
              <div className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-primary" /> 7 dias para troca ou devolução</div>
            </div>

            <div className="mt-6 p-4 bg-secondary/40 rounded-lg">
              <div className="text-sm font-semibold mb-2">Descrição</div>
              <p className="text-sm text-muted-foreground">
                Produto de alta qualidade com tecnologia de ponta. Entrega rápida e segura, embalagem reforçada e atendimento dedicado.
                Aproveite condições exclusivas e garanta o seu hoje mesmo.
              </p>
            </div>
          </div>

          {/* Buy box */}
          <aside className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4 sticky top-32">
              <div className="text-sm">
                Vendido por <span className="font-bold text-primary">{product.seller}</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Store className="h-3 w-3" /> Loja oficial · 98% positivas
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Quantidade:</span>
                <div className="flex items-center border border-border rounded-md">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-8 w-8 grid place-items-center hover:bg-secondary"><Minus className="h-3 w-3" /></button>
                  <span className="w-10 text-center font-semibold">{qty}</span>
                  <button onClick={() => setQty(qty + 1)} className="h-8 w-8 grid place-items-center hover:bg-secondary"><Plus className="h-3 w-3" /></button>
                </div>
              </div>
              <button
                onClick={() => addToCart(product, qty)}
                className="w-full h-11 rounded-lg bg-gradient-brand text-primary-foreground font-bold flex items-center justify-center gap-2 hover:opacity-95"
              >
                <ShoppingCart className="h-4 w-4" /> Comprar agora
              </button>
              <Link to="/cart" className="block text-center w-full h-11 rounded-lg border-2 border-primary text-primary font-bold leading-[2.5rem] hover:bg-primary/5">
                Adicionar ao carrinho
              </Link>
              <button
                onClick={() => toggleFav(product.id)}
                className="w-full h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary"
              >
                <Heart className={`h-4 w-4 ${isFav ? "fill-primary text-primary" : ""}`} /> {isFav ? "Favoritado" : "Adicionar aos favoritos"}
              </button>
              <button className="w-full h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary border border-border">
                <MessageCircle className="h-4 w-4" /> Falar com vendedor
              </button>
            </div>
          </aside>
        </div>

        {/* Related */}
        <section className="mt-12">
          <h2 className="text-2xl font-black mb-4">Quem viu também viu</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
