import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/marketplace/Header";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SellerSidebar } from "@/components/seller/SellerSidebar";
import { createMyStore } from "@/lib/seller-onboarding.functions";
import { Store, CheckCircle2, AlertTriangle, CreditCard } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/seller")({
  head: () => ({ meta: [{ title: "Painel do Vendedor — MercaBrasil" }] }),
  component: SellerLayout,
});

export type Seller = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean | null;
  stripe_payouts_enabled: boolean | null;
  stripe_onboarding_status: "pending" | "restricted" | "active" | null;
};

function SellerLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: seller, isLoading: sellerLoading } = useQuery<Seller | null>({
    queryKey: ["seller", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Seller | null;
    },
  });

  if (loading || !user || sellerLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 grid place-items-center text-muted-foreground">Carregando...</main>
      </div>
    );
  }

  if (!seller) return <CreateSellerForm userId={user.id} />;

  const status = seller.stripe_onboarding_status ?? "pending";
  const isActive = status === "active" && seller.stripe_charges_enabled;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <SellerSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-card flex items-center gap-3 px-3 sm:px-6 sticky top-0 z-30">
            <SidebarTrigger />
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Store className="h-4 w-4 text-primary shrink-0" />
              <span className="font-bold truncate">{seller.name}</span>
              <span
                className={`hidden sm:inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
                  isActive
                    ? "bg-success/10 text-success border border-success/30"
                    : "bg-amber-500/10 text-amber-700 border border-amber-500/30"
                }`}
              >
                {isActive ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {isActive ? "Pagamentos ativos" : "Configurar pagamentos"}
              </span>
            </div>
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline">
              ← Loja
            </Link>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function CreateSellerForm({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createStore = useServerFn(createMyStore);

  const createMut = useMutation({
    mutationFn: async () => createStore({ data: { name, description } }),
    onSuccess: () => {
      toast.success("Loja criada!");
      qc.invalidateQueries({ queryKey: ["seller", userId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 grid place-items-center px-4 py-12">
        <form
          onSubmit={(e) => { e.preventDefault(); if (name) createMut.mutate(); }}
          className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-brand"
        >
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand text-primary-foreground mb-3">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black">Crie sua loja</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Para começar a vender, dê um nome à sua loja.
          </p>
          <div className="space-y-3">
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da loja" className="w-full h-11 px-3 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/40 outline-none text-sm" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição (opcional)" rows={3} className="w-full px-3 py-2 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/40 outline-none text-sm" />
            <button disabled={createMut.isPending} className="w-full h-11 rounded-lg bg-gradient-brand text-primary-foreground font-bold hover:opacity-95 disabled:opacity-60 flex items-center justify-center gap-2">
              <CreditCard className="h-4 w-4" />
              {createMut.isPending ? "Criando..." : "Criar loja"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
