import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, ShoppingBag, Package, Boxes, Truck, Users, MessageSquare,
  TicketPercent, Sparkles, Star, BarChart3, Wallet, Store, Settings, CreditCard, LifeBuoy, Rocket,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";

type Item = { to: string; label: string; icon: any };

const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Vendas",
    items: [
      { to: "/seller", label: "Dashboard", icon: LayoutDashboard },
      { to: "/seller/orders", label: "Pedidos", icon: ShoppingBag },
      { to: "/seller/products", label: "Produtos", icon: Package },
      { to: "/seller/stock", label: "Estoque", icon: Boxes },
    ],
  },
  {
    label: "Marketing",
    items: [
      { to: "/seller/coupons", label: "Cupons", icon: TicketPercent },
      { to: "/seller/promotions", label: "Promoções", icon: Sparkles },
      { to: "/seller/ads", label: "Anúncios", icon: Rocket },
      { to: "/seller/reviews", label: "Avaliações", icon: Star },
    ],
  },
  {
    label: "Clientes",
    items: [
      { to: "/seller/customers", label: "Clientes", icon: Users },
      { to: "/messages", label: "Mensagens", icon: MessageSquare },
    ],
  },
  {
    label: "Logística",
    items: [{ to: "/seller/shipping", label: "Fretes", icon: Truck }],
  },
  {
    label: "Financeiro",
    items: [
      { to: "/seller/finance", label: "Carteira", icon: Wallet },
      { to: "/seller/reports", label: "Relatórios", icon: BarChart3 },
    ],
  },
  {
    label: "Conta",
    items: [
      { to: "/seller/profile", label: "Perfil da loja", icon: Store },
      { to: "/seller/settings", label: "Configurações", icon: Settings },
      { to: "/seller/subscription", label: "Assinatura", icon: CreditCard },
      { to: "/seller/help", label: "Ajuda", icon: LifeBuoy },
    ],
  },
];

export function SellerSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string) => (to === "/seller" ? pathname === "/seller" : pathname.startsWith(to));

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-brand text-primary-foreground">
            <Store className="h-4 w-4" />
          </div>
          {!collapsed && <div className="font-black text-sm truncate">Painel do Vendedor</div>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.label}>
                      <Link to={item.to} className="flex items-center gap-2">
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
    </Sidebar>
  );
}
