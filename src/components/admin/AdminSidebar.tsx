import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Store, Package, ShoppingBag, Tags, Ticket,
  Image as ImageIcon, DollarSign, TrendingUp, Truck, Megaphone, Settings, ShieldCheck, Flame, LifeBuoy, UserCog,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const sections: Array<{ label: string; items: Array<{ to: string; label: string; icon: any }> }> = [
  {
    label: "Geral",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operação",
    items: [
      { to: "/admin/users", label: "Usuários", icon: Users },
      { to: "/admin/vendors", label: "Vendedores", icon: Store },
      { to: "/admin/products", label: "Produtos", icon: Package },
      { to: "/admin/orders", label: "Pedidos", icon: ShoppingBag },
      { to: "/admin/categories", label: "Categorias", icon: Tags },
    ],
  },
  {
    label: "Marketing",
    items: [
      { to: "/admin/coupons", label: "Cupons", icon: Ticket },
      { to: "/admin/banners", label: "Banners", icon: ImageIcon },
      { to: "/admin/ads", label: "Anúncios", icon: Megaphone },
      { to: "/admin/carousel", label: "Carrossel Premium", icon: Flame },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { to: "/admin/finance", label: "Financeiro", icon: DollarSign },
      { to: "/admin/reports", label: "Relatórios", icon: TrendingUp },
    ],
  },
  {
    label: "Atendimento",
    items: [
      { to: "/admin/support", label: "Suporte", icon: LifeBuoy },
      { to: "/admin/support-team", label: "Equipe de Suporte", icon: UserCog },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/admin/shipping", label: "Frete (Melhor Envio)", icon: Truck },
      { to: "/admin/settings", label: "Configurações", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (path: string) =>
    path === "/admin" ? currentPath === "/admin" : currentPath.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <Link to="/admin" className="flex items-center gap-2.5 px-2 py-2 min-w-0">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br from-primary to-primary/70 grid place-items-center text-primary-foreground shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-black truncate leading-tight">Painel Admin</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">Proprietário</div>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {sections.map((sec) => (
          <SidebarGroup key={sec.label}>
            {!collapsed && <SidebarGroupLabel>{sec.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {sec.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.label}>
                      <Link to={item.to as any} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t">
        {!collapsed && (
          <div className="px-2 py-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistema online
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
