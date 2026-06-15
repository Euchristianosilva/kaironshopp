import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Search, LogOut, Settings as SettingsIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";

export function AdminTopbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const email = user?.email ?? "admin@plataforma";
  const name = (user?.user_metadata as any)?.full_name || email.split("@")[0];
  const initials = name.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <header className="sticky top-0 z-30 h-14 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="h-full px-3 sm:px-4 flex items-center gap-2 sm:gap-3">
        <SidebarTrigger className="shrink-0" />

        <div className="relative hidden md:flex flex-1 max-w-md min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Buscar usuários, pedidos, produtos..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted/60 border border-transparent text-sm outline-none focus:bg-background focus:border-border focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex-1 md:hidden" />

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            className="relative h-9 w-9 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
            aria-label="Notificações"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
          </button>

          <Link
            to="/admin/settings"
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
            aria-label="Configurações"
          >
            <SettingsIcon className="h-4 w-4" />
          </Link>

          <div className="h-7 w-px bg-border mx-0.5" />

          <div className="flex items-center gap-2 px-1 sm:px-2 h-9 rounded-lg">
            <div className="relative shrink-0">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70 grid place-items-center text-primary-foreground text-xs font-bold">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
            </div>
            <div className="hidden sm:block min-w-0 leading-tight">
              <div className="text-xs font-bold truncate max-w-[140px]">{name}</div>
              <div className="text-[10px] text-muted-foreground truncate">Proprietário</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
