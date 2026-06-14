import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { Truck, CheckCircle2, XCircle, Loader2, Copy, ExternalLink, ArrowLeft } from "lucide-react";
import {
  getShippingDiagnostics,
  pingMelhorEnvio,
} from "@/lib/shipping-diag.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/shipping")({
  head: () => ({ meta: [{ title: "Frete · Melhor Envio — Admin" }] }),
  component: AdminShipping,
});

function AdminShipping() {
  const fetchDiag = useServerFn(getShippingDiagnostics);
  const ping = useServerFn(pingMelhorEnvio);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["shipping-diagnostics"],
    queryFn: () => fetchDiag(),
  });

  const pingMut = useMutation({
    mutationFn: () => ping(),
    onSuccess: async (res) => {
      if (res.ok) toast.success(`Conexão OK (${res.status})`);
      else toast.error(`Falha (${res.status}): ${res.error ?? res.body ?? "ver detalhes abaixo"}`);
      await refetch();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao testar"),
  });

  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    toast.success("Copiado");
  };

  const d = data?.diagnostics;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar ao admin
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-2">
              <Truck className="h-7 w-7 text-primary" /> Integração Melhor Envio
            </h1>
            <p className="text-muted-foreground">Diagnóstico e status da API de fretes</p>
          </div>
          <button
            onClick={() => pingMut.mutate()}
            disabled={pingMut.isPending}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-60"
          >
            {pingMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Testar conexão
          </button>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">Carregando…</div>
        ) : !data ? (
          <div className="py-20 text-center text-destructive">Sem acesso (somente admin).</div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card title="Ambiente">
                <Badge tone={data.env === "production" ? "success" : "warn"}>
                  {data.env}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2 break-all">{data.base_url}</p>
              </Card>
              <Card title="Token">
                {data.token_present ? (
                  <>
                    <Badge tone="success">configurado</Badge>
                    <p className="text-xs text-muted-foreground mt-2 font-mono">{data.token_preview}</p>
                  </>
                ) : (
                  <Badge tone="error">ausente</Badge>
                )}
              </Card>
              <Card title="Último sucesso">
                <p className="text-sm">{d?.last_success_at ? new Date(d.last_success_at).toLocaleString("pt-BR") : "—"}</p>
              </Card>
              <Card title="Último erro">
                <p className="text-sm">
                  {d?.last_error_at ? (
                    <>
                      <Badge tone="error">{d.last_error_status ?? "?"}</Badge>{" "}
                      <span>{new Date(d.last_error_at).toLocaleString("pt-BR")}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </p>
              </Card>
            </div>

            <Card title="Webhook URL" className="mt-4">
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-secondary rounded text-xs break-all">{data.webhook_url}</code>
                <button onClick={() => copy(data.webhook_url)} className="h-9 px-3 rounded bg-secondary hover:bg-secondary/70 text-sm inline-flex items-center gap-1">
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Cole esta URL no painel Melhor Envio em Webhooks.</p>
            </Card>

            {d?.last_error_at && (
              <Card title="Detalhes do último erro" className="mt-4">
                <dl className="text-sm space-y-2">
                  <Row k="Status" v={String(d.last_error_status ?? "—")} />
                  <Row k="Endpoint" v={d.last_error_endpoint ?? "—"} />
                  <Row k="Ambiente" v={d.last_env ?? "—"} />
                  <div>
                    <dt className="text-xs text-muted-foreground mb-1">Resposta da API</dt>
                    <pre className="bg-secondary rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all">{d.last_error_body ?? "—"}</pre>
                  </div>
                  {d.last_request_payload && (
                    <div>
                      <dt className="text-xs text-muted-foreground mb-1">Payload enviado</dt>
                      <pre className="bg-secondary rounded p-3 text-xs overflow-x-auto">{JSON.stringify(d.last_request_payload, null, 2)}</pre>
                    </div>
                  )}
                </dl>
              </Card>
            )}

            <Card title="Como atualizar o token" className="mt-4">
              <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                <li>
                  Acesse{" "}
                  <a
                    className="text-primary inline-flex items-center gap-1 hover:underline"
                    href={data.env === "production" ? "https://melhorenvio.com.br" : "https://sandbox.melhorenvio.com.br"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    painel Melhor Envio ({data.env}) <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Vá em <strong>Minha Conta → Tokens</strong> e gere um novo token.</li>
                <li>
                  Escopos necessários: <code className="text-xs">shipping-calculate shipping-tracking shipping-checkout shipping-cancel cart-read cart-write</code>
                </li>
                <li>
                  Atualize o secret <code>MELHOR_ENVIO_TOKEN</code> em Lovable Cloud → Secrets.
                </li>
                <li>Confirme que o secret <code>MELHOR_ENVIO_ENV</code> bate com o ambiente do token (sandbox ou production).</li>
                <li>Volte aqui e clique em <strong>Testar conexão</strong>.</li>
              </ol>
            </Card>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 ${className}`}>
      <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Badge({ tone, children }: { tone: "success" | "warn" | "error"; children: React.ReactNode }) {
  const cls =
    tone === "success" ? "bg-success/15 text-success" :
    tone === "warn" ? "bg-warning/15 text-warning" :
    "bg-destructive/15 text-destructive";
  return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>
    {tone === "success" ? <CheckCircle2 className="h-3 w-3" /> : tone === "error" ? <XCircle className="h-3 w-3" /> : null}
    {children}
  </span>;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="text-xs text-muted-foreground w-24 shrink-0 pt-0.5">{k}</dt>
      <dd className="text-sm break-all flex-1">{v}</dd>
    </div>
  );
}
