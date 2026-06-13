import { Link } from "@tanstack/react-router";
import { Star, Heart, ShoppingCart, Truck } from "lucide-react";
import type { Product } from "@/lib/products";
import { formatBRL } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const isFav = useStore((s) => s.favorites.includes(product.id));
  const toggleFav = useStore((s) => s.toggleFavorite);
  const addToCart = useStore((s) => s.addToCart);
  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  return (
    <article className="group relative bg-card rounded-xl border border-border overflow-hidden hover:shadow-brand hover:-translate-y-0.5 transition-all duration-200">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="block aspect-square bg-secondary/30 relative overflow-hidden"
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[11px] font-bold px-2 py-0.5 rounded">
            -{discount}%
          </span>
        )}
      </Link>
      <button
        onClick={() => toggleFav(product.id)}
        aria-label="Favoritar"
        className={cn(
          "absolute top-2 right-2 h-8 w-8 rounded-full bg-background/90 backdrop-blur grid place-items-center hover:bg-background shadow transition",
          isFav && "text-primary",
        )}
      >
        <Heart className={cn("h-4 w-4", isFav && "fill-current")} />
      </button>

      <div className="p-3 space-y-1.5">
        <Link
          to="/product/$id"
          params={{ id: product.id }}
          className="text-sm line-clamp-2 min-h-[2.5rem] hover:text-primary transition"
        >
          {product.name}
        </Link>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3 w-3 fill-warning text-warning" />
          <span className="font-semibold text-foreground">{product.rating}</span>
          <span>· {product.sold.toLocaleString("pt-BR")} vendidos</span>
        </div>
        <div>
          {product.oldPrice && (
            <div className="text-xs text-muted-foreground line-through leading-none">
              {formatBRL(product.oldPrice)}
            </div>
          )}
          <div className="text-lg font-black text-foreground leading-tight">
            {formatBRL(product.price)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            em até 12x de {formatBRL(product.price / 12)}
          </div>
        </div>
        {product.freeShipping && (
          <div className="flex items-center gap-1 text-[11px] text-success font-semibold">
            <Truck className="h-3 w-3" /> Frete grátis
          </div>
        )}
        <button
          onClick={() => addToCart(product)}
          className="w-full mt-2 h-9 rounded-md bg-gradient-brand text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5 hover:opacity-95 transition"
        >
          <ShoppingCart className="h-4 w-4" /> Adicionar
        </button>
      </div>
    </article>
  );
}
