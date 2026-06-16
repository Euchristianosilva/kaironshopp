import { Link } from "@tanstack/react-router";
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Store,
  Menu,
  MapPin,
  LogOut,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { NotificationBell } from "./NotificationBell";
import { MobileBottomNav } from "./MobileBottomNav";
import kaironLogo from "@/assets/kairon-logo.png.asset.json";


export function Header() {
  const cartCount = useStore((s) => s.cart.reduce((a, i) => a + i.qty, 0));
  const favCount = useStore((s) => s.favorites.length);
  const { user, signOut, role } = useAuth();
  const displayName = (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0];
  const panelLink = role === "admin" ? "/admin" : role === "seller" ? "/seller" : null;
  const panelLabel = role === "admin" ? "Painel Admin" : role === "seller" ? "Painel Vendedor" : null;
  const PanelIcon = role === "admin" ? ShieldCheck : Store;

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
          <img
            src={kaironLogo.url}
            alt="Kairon Shop"
            className="h-10 w-10 object-contain drop-shadow-sm"
          />
          <span className="font-black text-xl tracking-tight hidden sm:inline">
            Kairon<span className="text-primary"> Shop</span>
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
            to={user ? "/account" : "/auth"}
            className="hidden md:flex flex-col items-start px-3 py-1.5 rounded hover:bg-secondary transition"
          >
            <span className="text-[11px] text-muted-foreground">{user ? "Olá," : "Olá, entre"}</span>
            <span className="font-semibold flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> {user ? displayName : "Minha conta"}
            </span>
          </Link>
          {user && (
            <button
              onClick={() => signOut()}
              aria-label="Sair"
              className="hidden md:inline-flex p-2.5 rounded-lg hover:bg-secondary transition"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
          {panelLink && panelLabel && (
            <Link
              to={panelLink as any}
              className="hidden lg:flex flex-col items-start px-3 py-1.5 rounded hover:bg-secondary transition"
            >
              <span className="text-[11px] text-muted-foreground">Acesso</span>
              <span className="font-semibold flex items-center gap-1">
                <PanelIcon className="h-3.5 w-3.5" /> {panelLabel}
              </span>
            </Link>
          )}
          <Link to="/favorites" aria-label="Favoritos" className="relative p-2.5 rounded-lg hover:bg-secondary transition">
            <Heart className="h-5 w-5" />
            {favCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">{favCount}</span>
            )}
          </Link>
          {user && (
            <Link to="/messages" aria-label="Mensagens" className="p-2.5 rounded-lg hover:bg-secondary transition">
              <MessageCircle className="h-5 w-5" />
            </Link>
          )}
          <NotificationBell />
          <Link to="/cart" aria-label="Carrinho" className="relative p-2.5 rounded-lg hover:bg-secondary transition">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">{cartCount}</span>
            )}
          </Link>
        </nav>
      </div>

      {/* Categories nav - hidden on mobile (replaced by bottom nav) */}
      <div className="border-t border-border bg-secondary/30 hidden md:block">
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

      <MobileBottomNav />
    </header>
  );
}

