import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { CreditCard, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/seller/subscription")({
  head: () => ({ meta: [{ title: "Minha Assinatura — Painel do Vendedor" }] }),
  component: Page,
});

function Page() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  if (loading || !user) return (
    <div className="min-h-0">
      <main className="flex-1 grid place-items-center text-muted-foreground">Carregando...</main>
    </div>
  );

  const features = [
    "Loja personalizada e ilimitada",
    "Produtos ilimitados com fotos, variações e estoque",
    "Pagamentos via Stripe Connect (cartão e Pix)",
    "Cupons, promoções e mensagens com clientes",
    "Relatórios financeiros e de vendas",
    "Notificações em tempo real",
  ];

  return (
    <div className="min-h-0">
      
      <main className="flex-1 container mx-auto px-4 py-8 space-y-6 max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-black flex items-center gap-2"><CreditCard className="h-7 w-7 text-primary" /> Minha Assinatura</h1>
          <Link to="/seller" className="text-sm text-primary hover:underline">← Painel</Link>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs font-semibold uppercase text-primary">Plano atual</div>
              <h2 className="text-2xl font-black mt-1">Vendedor — Grátis</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Você paga apenas a comissão por venda. Sem mensalidade.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black">R$ 0<span className="text-base text-muted-foreground">/mês</span></div>
              <div className="text-xs text-muted-foreground">Comissão da plataforma aplicada por venda</div>
            </div>
          </div>

          <ul className="mt-6 grid md:grid-cols-2 gap-2">
            {features.map((f) => (
              <li key={f} className="text-sm flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /> {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-bold">Planos pagos em breve</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Estamos preparando planos premium com taxas reduzidas, destaque na vitrine, anúncios patrocinados e suporte prioritário.
            Você será notificado quando estiverem disponíveis.
          </p>
        </div>
      </main>
      
    </div>
  );
}
