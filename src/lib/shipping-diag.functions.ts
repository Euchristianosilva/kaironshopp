import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MELHOR_ENVIO_ENDPOINT_AUDIT, MELHOR_ENVIO_SCOPE_TEXT, MELHOR_ENVIO_USER_AGENT, meBaseFor, oauthBaseFor } from "@/lib/melhor-envio.shared";

function normalizeOrigin(origin: string) {
  const url = new URL(origin);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Origem inválida");
  return url.origin;
}

function integrationUrls(origin: string) {
  const base = normalizeOrigin(origin);
  return {
    callback_url: `${base}/api/public/melhor-envio/oauth-callback`,
    webhook_url: `${base}/api/public/melhor-envio/webhook`,
  };
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { assertAdminAccess } = await import("@/lib/admin-auth.server");
  await assertAdminAccess(ctx.userId);
}

function mask(s: string | null | undefined) {
  if (!s) return null;
  if (s.length <= 10) return "••••";
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

export const getShippingDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cfg } = await supabaseAdmin
      .from("melhor_envio_config")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    const { data: diag } = await supabaseAdmin
      .from("shipping_diagnostics")
      .select("*")
      .eq("id", true)
      .maybeSingle();

    const row = (cfg ?? {}) as any;
    const env = row.environment ?? "sandbox";
    const baseUrl = meBaseFor(env);
    const oauthTokenEndpoint = `${oauthBaseFor(env)}/oauth/token`;
    const connectionTestEndpoint = `${baseUrl}/me`;
    return {
      config: {
        environment: env,
        client_id: row.client_id ?? "",
        client_secret_preview: mask(row.client_secret),
        access_token_preview: mask(row.access_token),
        refresh_token_preview: mask(row.refresh_token),
        token_expires_at: row.token_expires_at ?? null,
        token_expired: row.token_expires_at ? Date.parse(row.token_expires_at) <= Date.now() : false,
        callback_url: row.callback_url ?? "",
        webhook_url: row.webhook_url ?? "https://kaironshopp.lovable.app/api/public/melhor-envio/webhook",
        last_sync_at: row.last_sync_at ?? null,
        updated_at: row.updated_at ?? null,
        oauth_scopes: row.oauth_scopes ?? MELHOR_ENVIO_SCOPE_TEXT,
      },
      base_url: baseUrl,
      endpoints: {
        oauth_token: oauthTokenEndpoint,
        oauth_refresh_token: oauthTokenEndpoint,
        connection_test: connectionTestEndpoint,
        current_full_url: connectionTestEndpoint,
      },
      request_headers: {
        oauth_token: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": MELHOR_ENVIO_USER_AGENT,
        },
        oauth_refresh_token: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": MELHOR_ENVIO_USER_AGENT,
        },
        connection_test: {
          Authorization: "Bearer [masked]",
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": MELHOR_ENVIO_USER_AGENT,
        },
      },
      oauth: {
        authorize_base_url: `${oauthBaseFor(env)}/oauth/authorize`,
        token_endpoint: oauthTokenEndpoint,
        refresh_token_endpoint: oauthTokenEndpoint,
        scopes: MELHOR_ENVIO_SCOPE_TEXT,
        endpoints: MELHOR_ENVIO_ENDPOINT_AUDIT,
      },
      diagnostics: (diag as any) ?? null,
    };
  });

const OAuthStartSchema = z.object({
  environment: z.enum(["sandbox", "production"]),
  client_id: z.string().min(1).max(200),
  client_secret: z.string().min(1).max(500),
  webhook_url: z.preprocess((v) => v === "" ? null : v, z.string().trim().url("URL do webhook inválida").max(500).optional().nullable()),
  origin: z.string().url(),
});

export const startMelhorEnvioOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OAuthStartSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const urls = integrationUrls(data.origin);
    const webhookUrl = data.webhook_url || urls.webhook_url;
    const state = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await supabaseAdmin.from("melhor_envio_config").upsert({
      id: true,
      environment: data.environment,
      client_id: data.client_id,
      client_secret: data.client_secret,
      callback_url: urls.callback_url,
      webhook_url: webhookUrl,
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      oauth_state: state,
      oauth_state_expires_at: expiresAt,
      oauth_scopes: MELHOR_ENVIO_SCOPE_TEXT,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    } as never);
    if (error) throw new Error(error.message);

    const params = new URLSearchParams({
      client_id: data.client_id,
      redirect_uri: urls.callback_url,
      response_type: "code",
      scope: MELHOR_ENVIO_SCOPE_TEXT,
      state,
    });

    return {
      authorization_url: `${oauthBaseFor(data.environment)}/oauth/authorize?${params.toString()}`,
      callback_url: urls.callback_url,
      webhook_url: webhookUrl,
      scopes: MELHOR_ENVIO_SCOPE_TEXT,
      state_expires_at: expiresAt,
    };
  });

const SaveSchema = z.object({
  environment: z.enum(["sandbox", "production"]),
  client_id: z.string().trim().min(1, "Client ID obrigatório").max(200).optional().nullable(),
  client_secret: z.string().max(500).optional().nullable(),
  access_token: z.string().max(4000).optional().nullable(),
  refresh_token: z.string().max(4000).optional().nullable(),
  callback_url: z.string().max(500).optional().nullable(),
  webhook_url: z.preprocess((v) => v === "" ? null : v, z.string().trim().url("URL do webhook inválida").max(500).optional().nullable()),
});

export const saveMelhorEnvioConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: current } = await supabaseAdmin
      .from("melhor_envio_config")
      .select("*")
      .eq("id", true)
      .maybeSingle();

    const patch: Record<string, unknown> = {
      id: true,
      environment: data.environment,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    };
    // Keep existing values if blank input — lets admin update one field at a time.
    patch.client_id = data.client_id !== undefined ? data.client_id : current?.client_id ?? null;
    patch.callback_url = data.callback_url !== undefined ? data.callback_url : current?.callback_url ?? null;
    patch.webhook_url = data.webhook_url !== undefined ? data.webhook_url : current?.webhook_url ?? null;
    patch.client_secret = data.client_secret ? data.client_secret : current?.client_secret ?? null;
    patch.oauth_scopes = MELHOR_ENVIO_SCOPE_TEXT;
    const environmentChanged = current?.environment && current.environment !== data.environment;
    patch.access_token = environmentChanged ? null : data.access_token ? data.access_token : current?.access_token ?? null;
    patch.refresh_token = environmentChanged ? null : data.refresh_token ? data.refresh_token : current?.refresh_token ?? null;
    patch.token_expires_at = environmentChanged ? null : current?.token_expires_at ?? null;

    const { error } = await supabaseAdmin
      .from("melhor_envio_config")
      .upsert(patch as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const refreshMelhorEnvioToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { refreshAccessTokenIfNeeded } = await import("@/lib/melhor-envio.server");
    const { data: cfg } = await supabaseAdmin
      .from("melhor_envio_config")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    if (!cfg?.refresh_token) {
      return { ok: false, error: "Sem refresh token. Reconecte a aplicação via OAuth.", reauth_url: null };
    }
    // Force refresh by zeroing expiry
    const updated = await refreshAccessTokenIfNeeded(supabaseAdmin, { ...(cfg as any), token_expires_at: new Date(0).toISOString() });
    const ok = (updated as any)?.access_token && (updated as any)?.access_token !== (cfg as any)?.access_token;
    const { data: diag } = ok ? { data: null } : await supabaseAdmin
      .from("shipping_diagnostics")
      .select("reauth_url")
      .eq("id", true)
      .maybeSingle();
    return ok
      ? { ok: true, token_expires_at: (updated as any).token_expires_at, reauth_url: null }
      : { ok: false, error: "Falha ao atualizar o token. Verifique credenciais.", reauth_url: (diag as any)?.reauth_url ?? null };
  });

export const pingMelhorEnvio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { melhorEnvioRequest } = await import("@/lib/melhor-envio.server");
    const { data: cfg } = await supabaseAdmin
      .from("melhor_envio_config")
      .select("*")
      .eq("id", true)
      .maybeSingle();

    const env = cfg?.environment ?? "sandbox";
    const base = meBaseFor(env);
    const endpoint = `${base}/me`;

    if (!cfg?.access_token) {
      return {
        ok: false,
        status: 0,
        env,
        endpoint,
        request_headers: {
          Authorization: "Bearer [masked]",
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": MELHOR_ENVIO_USER_AGENT,
        },
        error: "Access Token não configurado. Reautorize o OAuth.",
        reauth_url: null,
        reauth_reason: "Access Token não configurado.",
      };
    }

    try {
      const result = await melhorEnvioRequest(supabaseAdmin, cfg as any, { endpoint, method: "GET" });
      const parsed: any = result.json;

      return {
        ok: result.ok,
        status: result.status,
        env,
        endpoint,
        request_headers: {
          Authorization: "Bearer [masked]",
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": MELHOR_ENVIO_USER_AGENT,
        },
        user: parsed && (parsed.email || parsed.name)
          ? { email: parsed.email, name: parsed.name }
          : null,
        body: result.text.slice(0, 12000),
        error: result.reauth_reason ?? undefined,
        reauth_url: result.reauth_url,
        reauth_reason: result.reauth_reason,
      };
    } catch (e) {
      return {
        ok: false,
        status: 0,
        env,
        endpoint,
        error: e instanceof Error ? e.message : "Erro desconhecido",
        body: null,
        user: null,
        reauth_url: null,
        reauth_reason: null,
      };
    }
  });
