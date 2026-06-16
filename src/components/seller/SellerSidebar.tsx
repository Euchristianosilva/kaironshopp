import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard, ShoppingBag, Package, BarChart3, Store, MessageSquare, LifeBuoy,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { listMyConversations } from "@/lib/chat.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const ITEMS: { to: string; label: string; icon: any }[] = [
  { to: "/seller", label: "Painel Vendedor", icon: LayoutDashboard },
  { to: "/seller/products", label: "Produtos", icon: Package },
  { to: "/seller/orders", label: "Pedidos", icon: ShoppingBag },
  { to: "/seller/messages", label: "Mensagens", icon: MessageSquare },
  { to: "/seller/reports", label: "Vendas", icon: BarChart3 },
  { to: "/seller/support", label: "Suporte", icon: LifeBuoy },
];

export function SellerSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();

  const list = useServerFn(listMyConversations);
  const { data, refetch } = useQuery({
    queryKey: ["seller-sidebar-conv-unread"],
    queryFn: () => list(),
    enabled: !!user,
    refetchInterval: 60_000,
  });

  // Realtime: refresh unread count when conversations change
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`seller-side-unread-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refetch]);

  const unreadTotal = (data?.conversations ?? []).reduce((acc: number, c: any) => {
    const isSeller = data?.sellerId === c.seller_id;
    return acc + (isSeller ? (c.seller_unread ?? 0) : 0);
  }, 0);

  const isActive = (to: string) =>
    to === "/seller" ? pathname === "/seller" : pathname.startsWith(to);

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
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Menu</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {ITEMS.map((item) => {
                const showBadge = item.to === "/seller/messages" && unreadTotal > 0;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.label}>
                      <Link to={item.to} className="flex items-center gap-2 relative">
                        <span className="relative shrink-0">
                          <item.icon className="h-4 w-4" />
                          {showBadge && collapsed && (
                            <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-4 min-w-4 px-1 grid place-items-center">
                              {unreadTotal > 9 ? "9+" : unreadTotal}
                            </span>
                          )}
                        </span>
                        {!collapsed && (
                          <>
                            <span className="truncate flex-1">{item.label}</span>
                            {showBadge && (
                              <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-5 min-w-5 px-1.5 grid place-items-center">
                                {unreadTotal > 99 ? "99+" : unreadTotal}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
