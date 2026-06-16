import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, Heart, ShoppingCart, User, LogOut, Package, MapPin, MessageCircle, Settings, Store, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type Item = {
  label: string;
  icon: typeof Home;
  to?: string;
  badge?: number;
  onClick?: () => void;
  active?: boolean;
};

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const cartCount = useStore((s) => s.cart.reduce((a, i) => a + i.qty, 0));
  const favCount = useStore((s) => s.favorites.length);
  const { user, signOut, role } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);

  const isActive = (path: string, exact = false) =>
    exact ? pathname === path : pathname === path || pathname.startsWith(path + "/");

  const items: Item[] = [
    { label: "Início", icon: Home, to: "/", active: isActive("/", true) },
    { label: "Categorias", icon: LayoutGrid, to: "/category/$slug", active: pathname.startsWith("/category") },
    { label: "Favoritos", icon: Heart, to: "/favorites", badge: favCount, active: isActive("/favorites") },
    { label: "Carrinho", icon: ShoppingCart, to: "/cart", badge: cartCount, active: isActive("/cart") },
  ];

  return (
    <>
      {/* Spacer so content isn't hidden behind the fixed bar on mobile */}
      <div
        className="md:hidden"
        style={{ height: "calc(64px + env(safe-area-inset-bottom, 0px))" }}
        aria-hidden="true"
      />

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Navegação principal"
      >
        <ul className="grid grid-cols-5 h-16">
          {items.map((it) => {
            const Icon = it.icon;
            const content = (
              <div className="relative flex flex-col items-center justify-center gap-0.5">
                <Icon className={`h-5 w-5 ${it.active ? "text-primary" : "text-muted-foreground"}`} />
                {it.badge != null && it.badge > 0 && (
                  <span className="absolute -top-1 right-2 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
                    {it.badge > 99 ? "99+" : it.badge}
                  </span>
                )}
                <span className={`text-[11px] font-medium ${it.active ? "text-primary" : "text-muted-foreground"}`}>
                  {it.label}
                </span>
              </div>
            );
            return (
              <li key={it.label}>
                {it.to === "/category/$slug" ? (
                  <Link
                    to="/category/$slug"
                    params={{ slug: "eletronicos" }}
                    className="h-full w-full flex items-center justify-center min-h-[44px] active:bg-secondary/60"
                  >
                    {content}
                  </Link>
                ) : (
                  <Link
                    to={it.to!}
                    className="h-full w-full flex items-center justify-center min-h-[44px] active:bg-secondary/60"
                  >
                    {content}
                  </Link>
                )}
              </li>
            );
          })}

          {/* Conta */}
          <li>
            <Sheet open={accountOpen} onOpenChange={setAccountOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="h-full w-full flex items-center justify-center min-h-[44px] active:bg-secondary/60"
                  aria-label="Minha conta"
                >
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <User className={`h-5 w-5 ${accountOpen ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-[11px] font-medium ${accountOpen ? "text-primary" : "text-muted-foreground"}`}>
                      Conta
                    </span>
                  </div>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl p-0 max-h-[85vh] overflow-y-auto">
                <SheetHeader className="px-5 pt-5 pb-3 text-left">
                  <SheetTitle className="text-base">
                    {user ? `Olá, ${(user.user_metadata?.full_name as string) || user.email?.split("@")[0]}` : "Minha conta"}
                  </SheetTitle>
                </SheetHeader>

                {!user ? (
                  <div className="px-5 pb-6 space-y-2">
                    <Link
                      to="/auth"
                      onClick={() => setAccountOpen(false)}
                      className="block w-full text-center bg-primary text-primary-foreground rounded-lg h-11 leading-[44px] font-semibold"
                    >
                      Entrar / Cadastrar
                    </Link>
                  </div>
                ) : (
                  <div className="pb-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}>
                    <MenuLink to="/account" icon={User} label="Meu Perfil" onClose={() => setAccountOpen(false)} />
                    <MenuLink to="/account" icon={Package} label="Meus Pedidos" onClose={() => setAccountOpen(false)} />
                    <MenuLink to="/account" icon={MapPin} label="Endereços" onClose={() => setAccountOpen(false)} />
                    <MenuLink to="/messages" icon={MessageCircle} label="Mensagens" onClose={() => setAccountOpen(false)} />
                    <MenuLink to="/favorites" icon={Heart} label="Favoritos" onClose={() => setAccountOpen(false)} />
                    <MenuLink to="/account" icon={Settings} label="Configurações" onClose={() => setAccountOpen(false)} />
                    {role === "seller" && (
                      <MenuLink to="/seller" icon={Store} label="Painel do Vendedor" onClose={() => setAccountOpen(false)} />
                    )}
                    {role === "admin" && (
                      <MenuLink to="/admin" icon={ShieldCheck} label="Painel Administrativo" onClose={() => setAccountOpen(false)} />
                    )}
                    <button
                      onClick={() => {
                        setAccountOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-3 px-5 py-3.5 text-destructive hover:bg-secondary/60 border-t border-border mt-2"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-medium">Sair</span>
                    </button>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </li>
        </ul>
      </nav>
    </>
  );
}

function MenuLink({
  to,
  icon: Icon,
  label,
  onClose,
}: {
  to: string;
  icon: typeof Home;
  label: string;
  onClose: () => void;
}) {
  return (
    <Link
      to={to as any}
      onClick={onClose}
      className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/60 active:bg-secondary"
    >
      <Icon className="h-5 w-5 text-muted-foreground" />
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}
