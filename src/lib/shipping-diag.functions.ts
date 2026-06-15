import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OAUTH_SCOPES = "shipping-calculate shipping-tracking cart-read cart-write";

function meBaseFor(env: string) {
  return env === "production"
    ? "https://www.melhorenvio.com.br/api/v2"
    : "https://sandbox.melhorenvio.com.br/api/v2";
}

function oauthBaseFor(env: string) {
  return env === "production"
    ? "https://www.melhorenvio.com.br"
    : "https://sandbox.melhorenvio.com.br";
}

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

function tokenExpiryFrom(expiresIn: unknown) {
  const seconds = typeof expiresIn === "number" ? expiresIn : Number(expiresIn ?? 0);
  return seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : null;
}

async function refreshAccessTokenIfNeeded(supabaseAdmin: any, cfg: any) {
  const expiresAt = cfg?.token_expires_at ? Date.parse(cfg.token_expires_at) : null;
  const stillValid = !expiresAt || expiresAt > Date.now() + 60_000;
  if (stillValid || !cfg?.refresh_token || !cfg?.client_id || !cfg?.client_secret) return cfg;

  const env = cfg.environment ?? "sandbox";
  const endpoint = `${oauthBaseFor(env)}/oauth/token`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Kairon Shopp (suporte@kaironshopp.com.br)",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: cfg.client_id,
        client_secret: cfg.client_secret,
        refresh_token: cfg.refresh_token,
      }).toString(),
    });
    const text = await res.text();
    let body: any = null;
    try { body = JSON.parse(text); } catch {}

    if (!res.ok || !body?.access_token) {
      await supabaseAdmin.from("shipping_diagnostics").upsert({
        id: true,
        last_error_at: new Date().toISOString(),
        last_error_status: res.status,
        last_error_endpoint: endpoint,
        last_error_body: text.slice(0, 1000),
        last_env: env,
        updated_at: new Date().toISOString(),
      });
      return cfg;
    }

    const patch = {
      access_token: body.access_token,
      refresh_token: body.refresh_token ?? cfg.refresh_token,
      token_expires_at: tokenExpiryFrom(body.expires_in),
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await supabaseAdmin.from("melhor_envio_config").update(patch as never).eq("id", true);
    return { ...cfg, ...patch };
  } catch (e) {
    await supabaseAdmin.from("shipping_diagnostics").upsert({
      id: true,
      last_error_at: new Date().toISOString(),
      last_error_status: 0,
      last_error_endpoint: endpoint,
      last_error_body: e instanceof Error ? e.message : String(e),
      last_env: env,
      updated_at: new Date().toISOString(),
    });
    return cfg;
  }
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

    let { data: cfg } = await supabaseAdmin
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
      },
      base_url: meBaseFor(env),
      oauth: {
        authorize_base_url: `${oauthBaseFor(env)}/oauth/authorize`,
        scopes: OAUTH_SCOPES,
      },
      diagnostics: diag ?? null,
    };
  });

const OAuthStartSchema = z.object({
  environment: z.enum(["sandbox", "production"]),
  client_id: z.string().min(1).max(200),
  client_secret: z.string().min(1).max(500),
  origin: z.string().url(),
});

export const startMelhorEnvioOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OAuthStartSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const urls = integrationUrls(data.origin);
    const state = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await supabaseAdmin.from("melhor_envio_config").upsert({
      id: true,
      environment: data.environment,
      client_id: data.client_id,
      client_secret: data.client_secret,
      callback_url: urls.callback_url,
      webhook_url: urls.webhook_url,
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      oauth_state: state,
      oauth_state_expires_at: expiresAt,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    } as never);
    if (error) throw new Error(error.message);

    const params = new URLSearchParams({
      client_id: data.client_id,
      redirect_uri: urls.callback_url,
      response_type: "code",
      scope: OAUTH_SCOPES,
      state,
    });

    return {
      authorization_url: `${oauthBaseFor(data.environment)}/oauth/authorize?${params.toString()}`,
      callback_url: urls.callback_url,
      webhook_url: urls.webhook_url,
      scopes: OAUTH_SCOPES,
      state_expires_at: expiresAt,
    };
  });

const SaveSchema = z.object({
  environment: z.enum(["sandbox", "production"]),
  client_id: z.string().max(200).optional().nullable(),
  client_secret: z.string().max(500).optional().nullable(),
  access_token: z.string().max(4000).optional().nullable(),
  refresh_token: z.string().max(4000).optional().nullable(),
  callback_url: z.string().max(500).optional().nullable(),
  webhook_url: z.string().max(500).optional().nullable(),
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
    patch.access_token = data.access_token ? data.access_token : current?.access_token ?? null;
    patch.refresh_token = data.refresh_token ? data.refresh_token : current?.refresh_token ?? null;

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
    const { data: cfg } = await supabaseAdmin
      .from("melhor_envio_config")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    if (!cfg?.refresh_token) {
      return { ok: false, error: "Sem refresh token. Reconecte a aplicação via OAuth." };
    }
    // Force refresh by zeroing expiry
    const updated = await refreshAccessTokenIfNeeded(supabaseAdmin, { ...(cfg as any), token_expires_at: new Date(0).toISOString() });
    const ok = (updated as any)?.access_token && (updated as any)?.access_token !== (cfg as any)?.access_token;
    return ok
      ? { ok: true, token_expires_at: (updated as any).token_expires_at }
      : { ok: false, error: "Falha ao atualizar o token. Verifique credenciais." };
  });

export const pingMelhorEnvio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let { data: cfg } = await supabaseAdmin
      .from("melhor_envio_config")
      .select("*")
      .eq("id", true)
      .maybeSingle();

    cfg = await refreshAccessTokenIfNeeded(supabaseAdmin, cfg as any);

    const env = cfg?.environment ?? "sandbox";
    const base = meBaseFor(env);
    const endpoint = `${base}/me`;
    const token = cfg?.access_token;

    if (!token) {
      return {
        ok: false,
        status: 0,
        env,
        endpoint,
        error: "Access Token não configurado. Preencha o formulário ao lado.",
      };
    }

    try {
      const res = await fetch(endpoint, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "Kairon Shopp (suporte@kaironshopp.com.br)",
        },
      });
      const text = await res.text();
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch {}

      if (res.ok) {
        await supabaseAdmin.from("shipping_diagnostics").upsert({
          id: true,
          last_success_at: new Date().toISOString(),
          last_env: env,
          updated_at: new Date().toISOString(),
        });
      } else {
        await supabaseAdmin.from("shipping_diagnostics").upsert({
          id: true,
          last_error_at: new Date().toISOString(),
          last_error_status: res.status,
          last_error_endpoint: endpoint,
          last_error_body: text.slice(0, 1000),
          last_env: env,
          updated_at: new Date().toISOString(),
        });
      }

      return {
        ok: res.ok,
        status: res.status,
        env,
        endpoint,
        user: parsed && (parsed.email || parsed.name)
          ? { email: parsed.email, name: parsed.name }
          : null,
        body: res.ok ? null : text.slice(0, 500),
      };
    } catch (e) {
      return {
        ok: false,
        status: 0,
        env,
        endpoint,
        error: e instanceof Error ? e.message : "Erro desconhecido",
      };
    }
  });
