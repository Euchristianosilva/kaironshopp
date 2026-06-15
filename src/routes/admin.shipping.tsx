import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  CheckCircle2, XCircle, Loader2, ArrowLeft, ArrowRight,
  KeyRound, ShieldCheck, Sparkles, RefreshCw,
} from "lucide-react";

import {
  getShippingDiagnostics,
  pingMelhorEnvio,
  saveMelhorEnvioConfig,
  startMelhorEnvioOAuth,
  refreshMelhorEnvioToken,
} from "@/lib/shipping-diag.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/shipping")({
  head: () => ({ meta: [{ title: "Assistente Melhor Envio — Admin" }] }),
  component: AdminShippingWizard,
});

type Wizard = {
  environment: "sandbox" | "production";
  client_id: string;
  client_secret: string;
  webhook_url: string;
};

const STEPS = [
  { key: "env", title: "Ambiente", icon: Sparkles },
  { key: "client", title: "Client ID & Secret", icon: KeyRound },
  { key: "oauth", title: "Autorizar OAuth", icon: ShieldCheck },
  { key: "test", title: "Validar e salvar", icon: CheckCircle2 },
] as const;

function AdminShippingWizard() {
  const fetchDiag = useServerFn(getShippingDiagnostics);
  const ping = useServerFn(pingMelhorEnvio);
  const save = useServerFn(saveMelhorEnvioConfig);
  const startOAuth = useServerFn(startMelhorEnvioOAuth);
  const refreshToken = useServerFn(refreshMelhorEnvioToken);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["me-config"],
    queryFn: () => fetchDiag(),
  });


  const [step, setStep] = useState(0);
  const [reconfigure, setReconfigure] = useState(false);
  const [form, setForm] = useState<Wizard>({
    environment: "sandbox",
    client_id: "",
    client_secret: "",
    webhook_url: "",
  });
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get("oauth");
    if (oauth === "success") toast.success("Autorização concluída. Tokens gerados automaticamente.");
    if (oauth === "error") toast.error(params.get("message") ?? "Falha na autorização OAuth.");
    if (oauth) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  useEffect(() => {
    if (!data) return;
    setForm((p) => ({
      ...p,
      environment: (data.config.environment as "sandbox" | "production") ?? "sandbox",
      client_id: data.config.client_id ?? "",
      webhook_url: data.config.webhook_url ?? "",
    }));
  }, [data]);

  const cfg = data?.config;
  const diag = data?.diagnostics;
  const alreadyConfigured = Boolean(cfg?.access_token_preview) && !reconfigure;

  const saveMut = useMutation({
    mutationFn: () => save({ data: form }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const oauthMut = useMutation({
    mutationFn: () => startOAuth({ data: { ...form, origin: window.location.origin } }),
    onSuccess: (res) => {
      setOauthUrl(res.authorization_url);
      setCallbackUrl(res.callback_url);
      toast.success("Credenciais salvas. Autorize a aplicação no Melhor Envio.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao iniciar OAuth"),
  });

  const pingMut = useMutation({
    mutationFn: () => ping(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao testar"),
  });

  const refreshMut = useMutation({
    mutationFn: () => refreshToken(),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Token atualizado com sucesso.");
        qc.invalidateQueries({ queryKey: ["me-config"] });
      } else {
        if (res.reauth_url) setOauthUrl(res.reauth_url);
        toast.error(res.error ?? "Não foi possível atualizar o token.");
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar token"),
  });

  async function handleFinish() {
    try {
      await saveMut.mutateAsync();
      const res = await pingMut.mutateAsync();
      if (res.ok) {
        toast.success("Integração ativada com sucesso!");
        setForm((p) => ({ ...p, client_secret: "" }));
        setReconfigure(false);
        await qc.invalidateQueries({ queryKey: ["me-config"] });
      } else {
        if (res.reauth_url) setOauthUrl(res.reauth_url);
        toast.error(res.reauth_reason ?? `Credenciais inválidas (${res.status}). Revise os tokens.`);
      }
    } catch {}
  }

  if (isLoading) {
    return (
      <Shell>
        <div className="py-20 text-center text-muted-foreground">Carregando…</div>
      </Shell>
    );
  }
  if (!data) {
    return (
      <Shell>
        <div className="py-20 text-center text-destructive">Sem dados.</div>
      </Shell>
    );
  }


  // Configured summary screen
  if (alreadyConfigured) {
    const pingRes = pingMut.data;
    return (
      <Shell>
        <div className="bg-card border border-border rounded-xl p-8 max-w-2xl mx-auto text-center">
          <div className={`inline-flex items-center gap-2 px-3 h-8 rounded-full text-sm font-bold mb-4 ${cfg?.token_expired ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>
            <span className="text-base leading-none">{cfg?.token_expired ? "🔴" : "🟢"}</span>
            {cfg?.token_expired ? "Desconectado" : "Conectado"}
          </div>
          <h2 className="text-2xl font-black mb-1">Integração Melhor Envio</h2>
          <p className="text-muted-foreground mb-6">
            Ambiente <strong>{cfg?.environment}</strong> · Token {cfg?.access_token_preview}
          </p>

          <div className="grid sm:grid-cols-2 gap-3 text-sm text-left mb-6">
            <InfoRow label="Status do token" value={cfg?.token_expired ? "Expirado" : "Ativo"} />
            <InfoRow label="Ambiente ativo" value={cfg?.environment === "production" ? "Production" : "Sandbox"} />
            <InfoRow label="Client ID" value={cfg?.client_id_preview ?? "—"} />
            <InfoRow label="Última sincronização" value={cfg?.last_sync_at ? new Date(cfg.last_sync_at).toLocaleString("pt-BR") : "—"} />
            <InfoRow label="Última atualização" value={cfg?.updated_at ? new Date(cfg.updated_at).toLocaleString("pt-BR") : "—"} />
            <InfoRow label="Último sucesso" value={diag?.last_success_at ? new Date(diag.last_success_at).toLocaleString("pt-BR") : "—"} />
            <InfoRow label="Último erro" value={diag?.last_error_at ? `${diag.last_error_status ?? "?"} · ${new Date(diag.last_error_at).toLocaleString("pt-BR")}` : "—"} />
            <InfoRow label="Método" value={diag?.last_request_method ?? "—"} />
            <InfoRow label="Status HTTP" value={diag?.last_error_status ?? "—"} />
            <InfoRow label="Endpoint base" value={data.base_url} />
            <div className="sm:col-span-2"><InfoRow label="OAuth obter token" value={data.endpoints.oauth_token} /></div>
            <div className="sm:col-span-2"><InfoRow label="OAuth refresh_token" value={data.endpoints.oauth_refresh_token} /></div>
            <div className="sm:col-span-2"><InfoRow label="Teste de conexão" value={data.endpoints.connection_test} /></div>
            <div className="sm:col-span-2"><InfoRow label="URL completa atual" value={diag?.last_error_endpoint ?? data.endpoints.current_full_url} /></div>
            <div className="sm:col-span-2"><InfoRow label="Última URL chamada" value={diag?.last_error_endpoint ?? "—"} /></div>
            <div className="sm:col-span-2"><InfoRow label="Escopos OAuth" value={cfg?.oauth_scopes || data.oauth.scopes} /></div>
            <div className="sm:col-span-2"><InfoRow label="Redirect URI" value={cfg?.callback_url || "—"} /></div>
            <div className="sm:col-span-2"><InfoRow label="Webhook URL" value={cfg?.webhook_url || "—"} /></div>
          </div>

          <details className="text-left text-xs rounded-md bg-secondary/40 p-3 mb-4" open>
            <summary className="cursor-pointer font-semibold">Log detalhado da última chamada</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words max-h-72 overflow-auto">{JSON.stringify({
              http_status: diag?.last_error_status ?? data.request_context.http_status,
              response_body: diag?.last_response_body ?? data.request_context.response_body,
              endpoint_called: diag?.last_error_endpoint ?? data.request_context.endpoint_called,
              oauth_scopes: cfg?.oauth_scopes || data.request_context.oauth_scopes,
              environment: data.request_context.environment,
              redirect_uri: cfg?.callback_url || data.request_context.redirect_uri,
              client_id_masked: cfg?.client_id_preview || data.request_context.client_id_masked,
            }, null, 2)}</pre>
          </details>

          <details className="text-left text-xs rounded-md bg-secondary/40 p-3 mb-4" open>
            <summary className="cursor-pointer font-semibold">Headers enviados nas requisições</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words max-h-56 overflow-auto">{JSON.stringify({
              oauth_token: data.request_headers.oauth_token,
              oauth_refresh_token: data.request_headers.oauth_refresh_token,
              connection_test: diag?.last_request_headers ?? data.request_headers.connection_test,
            }, null, 2)}</pre>
          </details>

          {diag?.last_response_body && (
            <details className="text-left text-xs rounded-md bg-secondary/40 p-3 mb-4">
              <summary className="cursor-pointer font-semibold">Resposta completa da última chamada</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words max-h-56 overflow-auto">{diag.last_response_body}</pre>
            </details>
          )}

          {pingRes && (
            <div className={`text-sm rounded-md p-3 mb-4 ${pingRes.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              {pingRes.ok ? `Conexão OK (${pingRes.status})${pingRes.user?.email ? ` — ${pingRes.user.email}` : ""}` : `Falha (${pingRes.status}): ${pingRes.error ?? pingRes.body ?? ""}`}
              {!pingRes.ok && pingRes.reauth_url && (
                <a href={pingRes.reauth_url} className="block mt-2 underline font-semibold">Reautorizar OAuth no Melhor Envio</a>
              )}
            </div>
          )}

          {diag?.reauth_required && (
            <div className="text-sm rounded-md p-3 mb-4 bg-destructive/10 text-destructive text-left">
              <strong>Reautorização necessária:</strong> {diag.reauth_reason ?? "Token inválido ou sem permissão."}
              {diag.reauth_url && <a href={diag.reauth_url} className="block mt-2 underline font-semibold">Abrir autorização OAuth</a>}
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => pingMut.mutate()}
              disabled={pingMut.isPending}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-md bg-secondary hover:bg-secondary/70 font-semibold disabled:opacity-60"
            >
              {pingMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Testar conexão
            </button>
            <button
              onClick={() => refreshMut.mutate()}
              disabled={refreshMut.isPending}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-md bg-secondary hover:bg-secondary/70 font-semibold disabled:opacity-60"
            >
              {refreshMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar Token
            </button>
            <button
              onClick={() => { setReconfigure(true); setStep(0); }}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              <RefreshCw className="h-4 w-4" />
              Reconfigurar
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // Wizard
  const canNext = (() => {
    if (step === 0) return !!form.environment;
    if (step === 1) return form.client_id.trim().length > 0 && form.client_secret.trim().length > 0;
    if (step === 2) return Boolean(cfg?.access_token_preview);
    return true;
  })();

  const StepIcon = STEPS[step].icon;
  const isBusy = saveMut.isPending || pingMut.isPending || oauthMut.isPending;

  return (
    <Shell>
      {/* Stepper */}
      <ol className="flex items-center justify-between mb-8 gap-2">
        {STEPS.map((s, i) => {
          const Active = i === step;
          const Done = i < step;
          return (
            <li key={s.key} className="flex-1 flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                Done ? "bg-success text-white" : Active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}>
                {Done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${Active ? "text-foreground" : "text-muted-foreground"}`}>{s.title}</span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
            </li>
          );
        })}
      </ol>

      <div className="bg-card border border-border rounded-xl p-6 sm:p-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <StepIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black">{STEPS[step].title}</h2>
            <p className="text-xs text-muted-foreground">Passo {step + 1} de {STEPS.length}</p>
          </div>
        </div>

        {step === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Escolha onde a integração vai operar. Use <strong>Sandbox</strong> para testes (não envia de verdade) e <strong>Produção</strong> para uso real.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {(["sandbox", "production"] as const).map((env) => (
                <button
                  key={env}
                  type="button"
                  onClick={() => setForm({ ...form, environment: env })}
                  className={`text-left rounded-lg border p-4 transition ${
                    form.environment === env ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                  }`}
                >
                  <div className="font-bold capitalize mb-1">{env === "sandbox" ? "Sandbox (teste)" : "Produção"}</div>
                  <div className="text-xs text-muted-foreground">
                    {env === "sandbox" ? "sandbox.melhorenvio.com.br" : "melhorenvio.com.br"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              No painel Melhor Envio, acesse <strong>Apps → Criar aplicação</strong> e copie as credenciais.
            </p>
            <Field label="Client ID">
              <input
                autoFocus
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
                placeholder="Cole o Client Secret"
              />
            </Field>
            <Field label="Webhook URL">
              <input
                className="input"
                type="url"
                value={form.webhook_url}
                onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
                placeholder="https://seu-dominio/api/public/melhor-envio/webhook"
              />
              <span className="block text-[11px] text-muted-foreground mt-1">
                URL que receberá eventos (frete, etiqueta, rastreio, status).
              </span>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Agora a plataforma abre o Melhor Envio para autorização oficial OAuth 2.0. O <strong>Access Token</strong> e o <strong>Refresh Token</strong> serão gerados automaticamente após a aprovação.
              <code className="block mt-1 text-[10px] bg-secondary rounded p-2">{data.oauth.scopes}</code>
            </p>
            <div className="rounded-lg bg-secondary/40 p-4 text-xs space-y-2">
              {data.oauth.endpoints.map((item) => (
                <InfoRow key={item.path} label={`${item.method} ${item.path}`} value={`${item.scope} · ${item.purpose}`} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => oauthMut.mutate()}
              disabled={oauthMut.isPending || !form.client_id || !form.client_secret}
              className="inline-flex items-center gap-2 px-5 h-11 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {oauthMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Gerar link de autorização
            </button>

            {callbackUrl && (
              <div className="rounded-lg bg-secondary/40 p-4 text-sm space-y-2">
                <InfoRow label="Callback URL" value={callbackUrl} />
                <p className="text-xs text-muted-foreground">Use esta URL no cadastro da aplicação Melhor Envio se o painel solicitar uma URL de redirecionamento.</p>
              </div>
            )}

            {oauthUrl && (
              <a
                href={oauthUrl}
                className="inline-flex items-center gap-2 px-5 h-11 rounded-md bg-success text-white font-semibold hover:opacity-90"
              >
                <ArrowRight className="h-4 w-4" /> Autorizar no Melhor Envio
              </a>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Revise as informações. Ao confirmar, vamos <strong>salvar com segurança</strong> e <strong>testar a conexão</strong> automaticamente.
            </p>
            <div className="rounded-lg bg-secondary/40 p-4 text-sm space-y-1">
              <InfoRow label="Ambiente" value={form.environment} />
              <InfoRow label="Client ID" value={form.client_id || "—"} />
              <InfoRow label="Client Secret" value={form.client_secret ? "••••••" : "—"} />
              <InfoRow label="Access Token" value={cfg?.access_token_preview ? `gerado (${cfg.access_token_preview})` : "será gerado pelo OAuth"} />
              <InfoRow label="Refresh Token" value={cfg?.refresh_token_preview ? "gerado automaticamente" : "opcional; depende do OAuth retornado"} />
            </div>

            {pingMut.data && (
              <div className={`text-sm rounded-md p-3 flex items-start gap-2 ${pingMut.data.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                {pingMut.data.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <XCircle className="h-4 w-4 mt-0.5" />}
                <div>
                  {pingMut.data.ok
                    ? `Conexão OK (${pingMut.data.status})${pingMut.data.user?.email ? ` — ${pingMut.data.user.email}` : ""}`
                    : `Falha (${pingMut.data.status}): ${pingMut.data.error ?? pingMut.data.body ?? "verifique credenciais"}`}
                  {!pingMut.data.ok && pingMut.data.reauth_url && (
                    <a href={pingMut.data.reauth_url} className="block mt-2 underline font-semibold">Reautorizar OAuth no Melhor Envio</a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-6 mt-6 border-t border-border">
          <button
            type="button"
            onClick={() => (step === 0 ? setReconfigure(false) : setStep(step - 1))}
            disabled={isBusy || (step === 0 && !cfg?.access_token_preview)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className="inline-flex items-center gap-2 px-5 h-10 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isBusy}
              className="inline-flex items-center gap-2 px-5 h-10 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-60"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Validar e ativar
            </button>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell title="Assistente Melhor Envio" description="Configuração guiada — passo a passo.">
      <div className="max-w-4xl mx-auto">{children}</div>
    </AdminShell>
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right break-all">{value}</span>
    </div>
  );
}
