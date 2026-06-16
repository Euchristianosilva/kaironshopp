import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { verifyStripeCheckout } from "@/lib/checkout.functions";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { formatBRL } from "@/lib/mock-data";

type Search = { session_id?: string };

export const Route = createFileRoute("/order/success")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  head: () => ({ meta: [{ title: "Pedido confirmado — Kairon Shop" }] }),
  errorComponent: () => <div className="min-h-screen grid place-items-center">Erro ao confirmar pedido.</div>,
  notFoundComponent: () => <div className="min-h-screen grid place-items-center">Página não encontrada.</div>,
  component: OrderSuccessPage,
});

function OrderSuccessPage() {
  const { session_id } = Route.useSearch();
  const navigate = useNavigate();
  const verify = useServerFn(verifyStripeCheckout);
  const [state, setState] = useState<{ status: "loading" | "paid" | "pending" | "error"; orderId?: string; total?: number; error?: string }>({ status: "loading" });

  useEffect(() => {
    if (!session_id) { setState({ status: "error", error: "Sessão de pagamento ausente." }); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await verify({ data: { session_id } });
        if (cancelled) return;
        setState({ status: res.paid ? "paid" : "pending", orderId: res.orderId, total: res.total });
      } catch (e: any) {
        if (cancelled) return;
        setState({ status: "error", error: e?.message ?? "Falha ao verificar pagamento" });
      }
    })();
    return () => { cancelled = true; };
  }, [session_id, verify]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-xl">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          {state.status === "loading" && (
            <>
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
              <h1 className="mt-4 text-2xl font-bold">Confirmando seu pagamento...</h1>
              <p className="text-muted-foreground mt-1">Aguarde um instante.</p>
            </>
          )}
          {state.status === "paid" && (
            <>
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
              <h1 className="mt-4 text-2xl font-bold">Pagamento confirmado!</h1>
              <p className="text-muted-foreground mt-2">
                Pedido #{state.orderId?.slice(0, 8)} {state.total != null && <>· Total {formatBRL(Number(state.total))}</>}
              </p>
              <p className="text-sm text-muted-foreground mt-2">Você receberá atualizações de envio por aqui e por e-mail.</p>
              <div className="flex gap-3 justify-center mt-6">
                <Link to="/account" className="h-10 px-5 inline-flex items-center rounded-lg bg-gradient-brand text-primary-foreground font-semibold">Ver meus pedidos</Link>
                <button onClick={() => navigate({ to: "/" })} className="h-10 px-5 rounded-lg border border-border font-semibold">Continuar comprando</button>
              </div>
            </>
          )}
          {state.status === "pending" && (
            <>
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
              <h1 className="mt-4 text-2xl font-bold">Pagamento em processamento</h1>
              <p className="text-muted-foreground mt-2">Assim que o Stripe confirmar, seu pedido será atualizado.</p>
              <Link to="/account" className="inline-block mt-6 h-10 px-5 leading-10 rounded-lg border border-border font-semibold">Acompanhar pedido</Link>
            </>
          )}
          {state.status === "error" && (
            <>
              <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
              <h1 className="mt-4 text-2xl font-bold">Não foi possível confirmar</h1>
              <p className="text-muted-foreground mt-2">{state.error}</p>
              <Link to="/account" className="inline-block mt-6 h-10 px-5 leading-10 rounded-lg border border-border font-semibold">Ir para meus pedidos</Link>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
