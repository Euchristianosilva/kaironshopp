import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { Truck, CheckCircle2, XCircle, Loader2, Copy, ExternalLink, ArrowLeft, Save } from "lucide-react";
import {
  getShippingDiagnostics,
  pingMelhorEnvio,
  saveMelhorEnvioConfig,
} from "@/lib/shipping-diag.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/shipping")({
  head: () => ({ meta: [{ title: "Configuração Melhor Envio — Admin" }] }),
  component: AdminShipping,
});

type FormState = {
  environment: "sandbox" | "production";
  client_id: string;
  client_secret: string;
  access_token: string;
  refresh_token: string;
  callback_url: string;
  webhook_url: string;
};

function AdminShipping() {
  const fetchDiag = useServerFn(getShippingDiagnostics);
  const ping = useServerFn(pingMelhorEnvio);
  const save = useServerFn(saveMelhorEnvioConfig);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["me-config"],
    queryFn: () => fetchDiag(),
  });

  const [form, setForm] = useState<FormState>({
    environment: "sandbox",
    client_id: "",
    client_secret: "",
    access_token: "",
    refresh_token: "",
    callback_url: "",
    webhook_url: "",
  });

  useEffect(() => {
    if (!data) return;
    setForm((prev) => ({
      ...prev,
      environment: (data.config.environment as "sandbox" | "production") ?? "sandbox",
      client_id: data.config.client_id ?? "",
      callback_url: data.config.callback_url ?? "",
      webhook_url: data.config.webhook_url ?? "",
    }));
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => save({ data: form }),
    onSuccess: async () => {
      toast.success("Configuração salva");
      setForm((p) => ({ ...p, client_secret: "", access_token: "", refresh_token: "" }));
      await qc.invalidateQueries({ queryKey: ["me-config"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const pingMut = useMutation({
    mutationFn: () => ping(),
    onSuccess: async (res) => {
      if (res.ok) toast.success(`Conexão OK (${res.status})${res.user?.email ? ` — ${res.user.email}` : ""}`);
      else toast.error(`Falha (${res.status}): ${res.error ?? res.body ?? "ver detalhes"}`);
      await qc.invalidateQueries({ queryKey: ["me-config"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao testar"),
  });

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copiado"); };

  const cfg = data?.config;
  const diag = data?.diagnostics;

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
              <Truck className="h-7 w-7 text-primary" /> Configuração Melhor Envio
            </h1>
            <p className="text-muted-foreground">
              Integração centralizada da plataforma. Nenhum vendedor precisa configurar uma conta própria.
            </p>
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
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Form */}
            <form
              className="lg:col-span-2 bg-card border border-border rounded-xl p-6 space-y-4"
              onSubmit={(e) => { e.preventDefault(); saveMut.mutate(); }}
            >
              <h2 className="font-bold text-lg">Credenciais</h2>

              <Field label="Ambiente">
                <select
                  className="input"
                  value={form.environment}
                  onChange={(e) => setForm({ ...form, environment: e.target.value as "sandbox" | "production" })}
                >
                  <option value="sandbox">Sandbox (teste)</option>
                  <option value="production">Produção</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">Endpoint: {data.base_url}</p>
              </Field>

              <Field label="Client ID">
                <input
                  className="input"
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  placeholder="ex.: 12345"
                />
              </Field>

              <Field label="Client Secret">
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={form.client_secret}
                  onChange={(e) => setForm({ ...form, client_secret: e.target.value })}
                  placeholder={cfg?.client_secret_preview ? `Atual: ${cfg.client_secret_preview} — preencha para alterar` : "Cole o Client Secret"}
                />
              </Field>

              <Field label="Access Token">
                <textarea
                  className="input min-h-[80px] font-mono text-xs"
                  value={form.access_token}
                  onChange={(e) => setForm({ ...form, access_token: e.target.value })}
                  placeholder={cfg?.access_token_preview ? `Atual: ${cfg.access_token_preview} — preencha para alterar` : "Cole o Access Token"}
                />
              </Field>

              <Field label="Refresh Token (opcional)">
                <textarea
                  className="input min-h-[60px] font-mono text-xs"
                  value={form.refresh_token}
                  onChange={(e) => setForm({ ...form, refresh_token: e.target.value })}
                  placeholder={cfg?.refresh_token_preview ? `Atual: ${cfg.refresh_token_preview} — preencha para alterar` : "Cole o Refresh Token"}
                />
              </Field>

              <Field label="URL de Callback (OAuth)">
                <input
                  className="input"
                  value={form.callback_url}
                  onChange={(e) => setForm({ ...form, callback_url: e.target.value })}
                  placeholder="https://kaironshopp.lovable.app/api/public/melhor-envio/oauth-callback"
                />
              </Field>

              <Field label="Webhook URL">
                <div className="flex items-center gap-2">
                  <input
                    className="input flex-1"
                    value={form.webhook_url}
                    onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
                    placeholder="https://kaironshopp.lovable.app/api/public/melhor-envio/webhook"
                  />
                  <button type="button" onClick={() => copy(form.webhook_url)} className="h-10 px-3 rounded bg-secondary hover:bg-secondary/70 text-sm inline-flex items-center gap-1">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Cole esta URL no painel Melhor Envio em Webhooks.</p>
              </Field>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saveMut.isPending}
                  className="inline-flex items-center gap-2 px-5 h-10 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-60"
                >
                  {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar configuração
                </button>
              </div>
            </form>

            {/* Status side */}
            <aside className="space-y-4">
              <Card title="Status">
                <Row k="Ambiente" v={
                  <Badge tone={cfg?.environment === "production" ? "success" : "warn"}>{cfg?.environment}</Badge>
                } />
                <Row k="Access Token" v={
                  cfg?.access_token_preview
                    ? <Badge tone="success">configurado</Badge>
                    : <Badge tone="error">ausente</Badge>
                } />
                <Row k="Última atualização" v={
                  cfg?.updated_at ? new Date(cfg.updated_at).toLocaleString("pt-BR") : "—"
                } />
                <Row k="Último sucesso" v={
                  diag?.last_success_at ? new Date(diag.last_success_at).toLocaleString("pt-BR") : "—"
                } />
                <Row k="Último erro" v={
                  diag?.last_error_at ? (
                    <span><Badge tone="error">{diag.last_error_status ?? "?"}</Badge> {new Date(diag.last_error_at).toLocaleString("pt-BR")}</span>
                  ) : "—"
                } />
              </Card>

              {diag?.last_error_at && (
                <Card title="Detalhe do último erro">
                  <p className="text-xs text-muted-foreground mb-1">Endpoint</p>
                  <p className="text-xs break-all mb-2">{diag.last_error_endpoint ?? "—"}</p>
                  <p className="text-xs text-muted-foreground mb-1">Resposta</p>
                  <pre className="bg-secondary rounded p-2 text-xs overflow-x-auto whitespace-pre-wrap break-all">{diag.last_error_body ?? "—"}</pre>
                </Card>
              )}

              <Card title="Como gerar credenciais">
                <ol className="text-xs space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>
                    <a className="text-primary inline-flex items-center gap-1 hover:underline" href={cfg?.environment === "production" ? "https://melhorenvio.com.br" : "https://sandbox.melhorenvio.com.br"} target="_blank" rel="noreferrer">
                      Painel Melhor Envio <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>Apps → Criar aplicação → copie Client ID/Secret</li>
                  <li>Gere Access Token com escopos: <code className="text-[10px]">shipping-calculate shipping-tracking cart-read cart-write</code></li>
                  <li>Cole tudo aqui e salve</li>
                </ol>
              </Card>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="font-bold text-xs uppercase tracking-wide text-muted-foreground mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold mb-1">{label}</span>
      {children}
    </label>
  );
}

function Badge({ tone, children }: { tone: "success" | "warn" | "error"; children: React.ReactNode }) {
  const cls =
    tone === "success" ? "bg-success/15 text-success" :
    tone === "warn" ? "bg-warning/15 text-warning" :
    "bg-destructive/15 text-destructive";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {tone === "success" ? <CheckCircle2 className="h-3 w-3" /> : tone === "error" ? <XCircle className="h-3 w-3" /> : null}
      {children}
    </span>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
