import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SellerStats } from "@/components/seller/SellerStats";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { createConnectAccount, refreshConnectStatus, createExpressDashboardLink } from "@/lib/connect.functions";
import { CheckCircle2, AlertTriangle, CreditCard, Plus, Package, ShoppingBag, Wallet, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/")({
  head: () => ({ meta: [{ title: "Dashboard — Painel do Vendedor" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const { data: seller } = useQuery({
    queryKey: ["seller", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("sellers").select("*").eq("owner_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["seller-products", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,title,is_active,stock,min_stock,price")
        .eq("seller_id", seller!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!seller) return null;

  return (
    <div className="max-w-7xl mx-auto">
      <SellerPageHeader
        title="Dashboard"
        description="Visão geral da sua loja e métricas em tempo real."
        actions={
          <Link
            to="/seller/products"
            className="h-10 px-4 rounded-lg bg-gradient-brand text-primary-foreground font-semibold text-sm flex items-center gap-2 hover:opacity-95"
          >
            <Plus className="h-4 w-4" /> Novo produto
          </Link>
        }
      />

      <ConnectCard seller={seller} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        <QuickAction to="/seller/orders" icon={<ShoppingBag className="h-5 w-5" />} label="Pedidos" desc="Acompanhar e enviar" />
        <QuickAction to="/seller/products" icon={<Package className="h-5 w-5" />} label="Produtos" desc="Gerenciar catálogo" />
        <QuickAction to="/seller/finance" icon={<Wallet className="h-5 w-5" />} label="Financeiro" desc="Saldo e saques" />
        <QuickAction to="/seller/reports" icon={<BarChart3 className="h-5 w-5" />} label="Relatórios" desc="Vendas e receita" />
      </div>

      <SellerStats sellerId={seller.id} products={products} />
    </div>
  );
}

function QuickAction({ to, icon, label, desc }: { to: string; icon: React.ReactNode; label: string; desc: string }) {
  return (
    <Link to={to} className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary mb-2">{icon}</div>
      <div className="font-bold">{label}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </Link>
  );
}

function ConnectCard({ seller }: { seller: any }) {
  const qc = useQueryClient();
  const createAcct = useServerFn(createConnectAccount);
  const refresh = useServerFn(refreshConnectStatus);
  const dashboard = useServerFn(createExpressDashboardLink);
  const [loading, setLoading] = useState<string | null>(null);

  const status = seller.stripe_onboarding_status ?? "pending";
  const isActive = status === "active" && seller.stripe_charges_enabled;
  const hasAccount = !!seller.stripe_account_id;

  if (isActive) return null;

  const startOnboarding = async () => {
    try {
      setLoading("onboard");
      const { url } = await createAcct({ data: { origin: window.location.origin } });
      window.location.href = url!;
    } catch (e: any) { toast.error(e?.message ?? "Erro"); setLoading(null); }
  };
  const syncStatus = async () => {
    try {
      setLoading("sync");
      await refresh();
      await qc.invalidateQueries({ queryKey: ["seller"] });
      toast.success("Status atualizado");
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setLoading(null); }
  };

  return (
    <div className="border rounded-xl p-5 bg-amber-500/5 border-amber-500/30">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="font-bold flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Configure os recebimentos
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {status === "restricted"
                ? "Sua conta está com restrições. Conclua as informações pendentes."
                : hasAccount
                ? "Onboarding incompleto. Finalize para começar a vender."
                : "Conecte sua conta Stripe para receber pagamentos."}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={startOnboarding} disabled={loading === "onboard"} className="h-10 px-4 rounded-lg bg-gradient-brand text-primary-foreground font-semibold text-sm disabled:opacity-60">
            {loading === "onboard" ? "Abrindo..." : hasAccount ? "Continuar" : "Configurar"}
          </button>
          {hasAccount && (
            <button onClick={syncStatus} disabled={loading === "sync"} className="h-10 px-4 rounded-lg border border-border font-semibold text-sm hover:bg-secondary">
              {loading === "sync" ? "..." : "Atualizar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
