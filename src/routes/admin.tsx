import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { supabase } from "@/integrations/supabase/client";
import { getAdminOverview } from "@/lib/admin.functions";
import {
  Users, Store, ShoppingBag, DollarSign, Image as ImageIcon, Ticket,
  Rocket, Truck, Package, BarChart3, Settings, CreditCard, Megaphone,
  TrendingUp, Percent, ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — MercaBrasil" }] }),
  component: Admin,
});

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const modules: Array<{ to: string; label: string; desc: string; icon: any; accent: string; soon?: boolean }> = [
  { to: "/admin", label: "Dashboard", desc: "Visão geral", icon: BarChart3, accent: "from-blue-500 to-cyan-500" },
  { to: "/admin/finance", label: "Financeiro", desc: "Receita, comissões e relatórios", icon: DollarSign, accent: "from-emerald-500 to-teal-500" },
  { to: "/admin/shipping", label: "Frete (Melhor Envio)", desc: "Integração e testes", icon: Truck, accent: "from-amber-500 to-orange-500" },
  { to: "/admin/ads", label: "Anúncios patrocinados", desc: "Campanhas e métricas", icon: Rocket, accent: "from-fuchsia-500 to-pink-500" },
  { to: "/admin", label: "Vendedores", desc: "Aprovar, suspender e editar", icon: Store, accent: "from-indigo-500 to-violet-500", soon: true },
  { to: "/admin", label: "Usuários", desc: "Bloquear e consultar", icon: Users, accent: "from-sky-500 to-blue-500", soon: true },
  { to: "/admin", label: "Produtos", desc: "Aprovar, destacar e remover", icon: Package, accent: "from-rose-500 to-red-500", soon: true },
  { to: "/admin", label: "Pedidos", desc: "Listar, filtrar e cancelar", icon: ShoppingBag, accent: "from-lime-500 to-green-500", soon: true },
  { to: "/admin", label: "Cupons & Promoções", desc: "Criar e gerenciar cupons", icon: Ticket, accent: "from-purple-500 to-indigo-500", soon: true },
  { to: "/admin", label: "Banners", desc: "Gerenciar banners da home", icon: ImageIcon, accent: "from-pink-500 to-rose-500", soon: true },
  { to: "/admin", label: "Planos & Assinaturas", desc: "Planos de vendedores", icon: CreditCard, accent: "from-teal-500 to-emerald-500", soon: true },
  { to: "/admin", label: "Marketing", desc: "Notificações e campanhas", icon: Megaphone, accent: "from-orange-500 to-amber-500", soon: true },
  { to: "/admin", label: "Configurações", desc: "Plataforma, SEO e identidade", icon: Settings, accent: "from-slate-500 to-zinc-500", soon: true },
];

function Admin() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        navigate({ to: "/auth" });
        return;
      }
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" });
      if (!mounted) return;
      setAllowed(Boolean(isAdmin));
      setAuthChecked(true);
    })();
    return () => { mounted = false; };
  }, [navigate]);

  const fetchOverview = useServerFn(getAdminOverview);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview(),
    enabled: allowed,
    staleTime: 30_000,
  });

  if (!authChecked) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12 text-center text-muted-foreground">Verificando permissões...</main>
        <Footer />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16 max-w-lg text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-destructive/10 grid place-items-center text-destructive mb-4">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black mb-2">Acesso restrito</h1>
          <p className="text-muted-foreground mb-6">Esta área é exclusiva para o proprietário da plataforma.</p>
          <Link to="/" className="inline-flex items-center px-4 h-10 rounded-md bg-primary text-primary-foreground font-semibold">Voltar para a loja</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const kpis = [
    { label: "Usuários", value: data ? data.users.toLocaleString("pt-BR") : "—", icon: Users },
    { label: "Vendedores", value: data ? data.sellers.toLocaleString("pt-BR") : "—", icon: Store },
    { label: "Produtos", value: data ? data.products.toLocaleString("pt-BR") : "—", sub: data ? `${data.productsInactive} inativos` : undefined, icon: Package },
    { label: "Pedidos hoje", value: data ? data.ordersToday.toLocaleString("pt-BR") : "—", icon: ShoppingBag },
    { label: "Faturamento hoje", value: data ? formatBRL(data.grossToday) : "—", icon: DollarSign },
    { label: "Faturamento (mês)", value: data ? formatBRL(data.grossMonth) : "—", sub: data?.growth != null ? `${data.growth >= 0 ? "+" : ""}${data.growth.toFixed(1)}% vs mês ant.` : undefined, icon: TrendingUp },
    { label: "Comissão (mês)", value: data ? formatBRL(data.feeMonth) : "—", icon: Percent },
    { label: "Pedidos (mês)", value: data ? data.ordersMonth.toLocaleString("pt-BR") : "—", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 mb-6 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
              <ShieldCheck className="h-3.5 w-3.5" /> Owner
            </div>
            <h1 className="truncate text-2xl sm:text-3xl font-black">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground">Controle geral da plataforma</p>
          </div>
        </header>

        {error && (
          <div className="mb-6 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-sm text-destructive">
            Erro ao carregar dados: {(error as Error).message}
          </div>
        )}

        <section aria-label="Indicadores" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="bg-card border border-border rounded-xl p-4 sm:p-5 min-w-0">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-gradient-brand grid place-items-center text-primary-foreground mb-3 shrink-0">
                <k.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="text-lg sm:text-2xl font-black truncate">{isLoading && !data ? "…" : k.value}</div>
              <div className="text-xs text-muted-foreground mt-1 truncate">{k.label}</div>
              {k.sub && <div className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">{k.sub}</div>}
            </div>
          ))}
        </section>

        <section aria-label="Módulos" className="mt-8">
          <h2 className="text-lg font-bold mb-3">Módulos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {modules.map((m) => {
              const content = (
                <div className="group h-full bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-primary/40 hover:shadow-md transition-all min-w-0">
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${m.accent} grid place-items-center text-white mb-3 shrink-0`}>
                    <m.icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="font-bold truncate">{m.label}</div>
                    {m.soon && <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-warning/15 text-warning font-semibold">Em breve</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.desc}</div>
                </div>
              );
              if (m.soon) {
                return <div key={m.label} className="opacity-70 cursor-not-allowed">{content}</div>;
              }
              return (
                <Link key={m.label} to={m.to as any} className="block focus:outline-none focus:ring-2 focus:ring-primary rounded-xl">
                  {content}
                </Link>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
