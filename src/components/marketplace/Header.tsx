import { Link } from "@tanstack/react-router";
import {
  Search,
  ShoppingCart,
  Heart,
  Bell,
  User,
  Store,
  Menu,
  MapPin,
} from "lucide-react";
import { useStore } from "@/lib/store";

export function Header() {
  const cartCount = useStore((s) => s.cart.reduce((a, i) => a + i.qty, 0));
  const favCount = useStore((s) => s.favorites.length);

  return (
    <header className="sticky top-0 z-40 w-full bg-background border-b border-border shadow-sm">
      {/* Top strip */}
      <div className="bg-gradient-brand text-primary-foreground text-xs">
        <div className="container mx-auto px-4 h-8 flex items-center justify-between">
          <div className="flex items-center gap-2 opacity-95">
            <MapPin className="h-3.5 w-3.5" />
            <span>Entregamos para todo o Brasil · Frete grátis acima de R$ 199</span>
          </div>
          <div className="hidden md:flex items-center gap-4 opacity-95">
            <Link to="/seller" className="hover:underline">Venda na plataforma</Link>
            <Link to="/admin" className="hover:underline">Central de Ajuda</Link>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="container mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="h-9 w-9 rounded-lg bg-gradient-brand grid place-items-center text-primary-foreground font-black shadow-brand">
            M
          </div>
          <span className="font-black text-xl tracking-tight hidden sm:inline">
            Merca<span className="text-primary">Brasil</span>
          </span>
        </Link>

        {/* Search */}
        <form className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar produtos, marcas e categorias..."
              className="w-full h-11 pl-10 pr-28 rounded-lg border border-border bg-secondary/40 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
            >
              Buscar
            </button>
          </div>
        </form>

        {/* Actions */}
        <nav className="flex items-center gap-1 sm:gap-2 text-sm">
          <Link
            to="/account"
            className="hidden md:flex flex-col items-start px-3 py-1.5 rounded hover:bg-secondary transition"
          >
            <span className="text-[11px] text-muted-foreground">Olá, entre</span>
            <span className="font-semibold flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> Minha conta
            </span>
          </Link>
          <Link
            to="/seller"
            className="hidden lg:flex flex-col items-start px-3 py-1.5 rounded hover:bg-secondary transition"
          >
            <span className="text-[11px] text-muted-foreground">Painel</span>
            <span className="font-semibold flex items-center gap-1">
              <Store className="h-3.5 w-3.5" /> Vendedor
            </span>
          </Link>
          <Link to="/favorites" aria-label="Favoritos" className="relative p-2.5 rounded-lg hover:bg-secondary transition">
            <Heart className="h-5 w-5" />
            {favCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">{favCount}</span>
            )}
          </Link>
          <Link to="/account" aria-label="Notificações" className="relative p-2.5 rounded-lg hover:bg-secondary transition">
            <Bell className="h-5 w-5" />
          </Link>
          <Link to="/cart" aria-label="Carrinho" className="relative p-2.5 rounded-lg hover:bg-secondary transition">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">{cartCount}</span>
            )}
          </Link>
        </nav>
      </div>

      {/* Categories nav */}
      <div className="border-t border-border bg-secondary/30">
        <div className="container mx-auto px-4 h-11 flex items-center gap-6 overflow-x-auto text-sm whitespace-nowrap">
          <button className="flex items-center gap-1.5 font-semibold text-primary">
            <Menu className="h-4 w-4" /> Todas as categorias
          </button>
          {[
            { s: "eletronicos", n: "Eletrônicos" },
            { s: "celulares", n: "Celulares" },
            { s: "informatica", n: "Informática" },
            { s: "moda-feminina", n: "Moda" },
            { s: "casa", n: "Casa" },
            { s: "esportes", n: "Esportes" },
            { s: "games", n: "Games" },
            { s: "beleza", n: "Beleza" },
            { s: "petshop", n: "Pet Shop" },
          ].map((c) => (
            <Link
              key={c.s}
              to="/category/$slug"
              params={{ slug: c.s }}
              className="text-foreground/70 hover:text-primary transition"
            >
              {c.n}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
