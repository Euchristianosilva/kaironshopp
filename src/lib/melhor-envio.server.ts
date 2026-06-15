import { MELHOR_ENVIO_SCOPE_TEXT, oauthBaseFor } from "@/lib/melhor-envio.shared";

type MelhorEnvioConfig = {
  environment?: string | null;
  client_id?: string | null;
  client_secret?: string | null;
  callback_url?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
};

type DiagnosticInput = {
  ok: boolean;
  env: string;
  endpoint: string;
  method: string;
  status: number;
  responseBody?: string | null;
  requestPayload?: unknown;
  reauthRequired?: boolean;
  reauthReason?: string | null;
  reauthUrl?: string | null;
};

type MelhorEnvioRequestInput = {
  endpoint: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  requestPayload?: unknown;
};

export function tokenExpiryFrom(expiresIn: unknown) {
  const seconds = typeof expiresIn === "number" ? expiresIn : Number(expiresIn ?? 0);
  return seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : null;
}

function safeJson(text: string) {
  try { return text ? JSON.parse(text) : null; } catch { return null; }
}

function redactSensitiveProviderBody(text: string) {
  const parsed = safeJson(text);
  if (!parsed) {
    return text.replace(/("?(?:access_token|refresh_token|client_secret|token)"?\s*[:=]\s*)"?[^",\s}]+"?/gi, "$1\"[redacted]\"");
  }
  const redact = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        /^(access_token|refresh_token|client_secret|token)$/i.test(key) ? "[redacted]" : redact(val),
      ]));
    }
    return value;
  };
  return JSON.stringify(redact(parsed));
}

function responseForStorage(text: string) {
  return redactSensitiveProviderBody(text).slice(0, 12000);
}

export async function recordMelhorEnvioDiagnostic(supabaseAdmin: any, input: DiagnosticInput) {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    id: true,
    last_env: input.env,
    last_error_endpoint: input.endpoint,
    last_request_method: input.method,
    last_error_status: input.status,
    last_response_body: responseForStorage(input.responseBody ?? ""),
    requested_scopes: MELHOR_ENVIO_SCOPE_TEXT,
    reauth_required: Boolean(input.reauthRequired),
    reauth_reason: input.reauthReason ?? null,
    reauth_url: input.reauthUrl ?? null,
    updated_at: now,
  };

  if (input.requestPayload !== undefined) patch.last_request_payload = input.requestPayload;

  if (input.ok) {
    patch.last_success_at = now;
    patch.last_error_at = null;
    patch.last_error_body = null;
  } else {
    patch.last_error_at = now;
    patch.last_error_body = responseForStorage(input.responseBody ?? "");
  }

  await supabaseAdmin.from("shipping_diagnostics").upsert(patch as never);
}

export function buildAuthorizationUrl(cfg: MelhorEnvioConfig, state: string) {
  const env = cfg.environment ?? "sandbox";
  if (!cfg.client_id || !cfg.callback_url) return null;
  const params = new URLSearchParams({
    client_id: cfg.client_id,
    redirect_uri: cfg.callback_url,
    response_type: "code",
    scope: MELHOR_ENVIO_SCOPE_TEXT,
    state,
  });
  return `${oauthBaseFor(env)}/oauth/authorize?${params.toString()}`;
}

export async function markMelhorEnvioRequiresOAuth(
  supabaseAdmin: any,
  cfg: MelhorEnvioConfig,
  reason: string,
  diagnostic?: Omit<DiagnosticInput, "reauthRequired" | "reauthReason" | "reauthUrl">,
) {
  const state = crypto.randomUUID();
  const stateExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const reauthUrl = buildAuthorizationUrl(cfg, state);

  await supabaseAdmin.from("melhor_envio_config").update({
    access_token: null,
    refresh_token: null,
    token_expires_at: null,
    oauth_state: reauthUrl ? state : null,
    oauth_state_expires_at: reauthUrl ? stateExpiresAt : null,
    oauth_scopes: MELHOR_ENVIO_SCOPE_TEXT,
    updated_at: new Date().toISOString(),
  } as never).eq("id", true);

  if (diagnostic) {
    await recordMelhorEnvioDiagnostic(supabaseAdmin, {
      ...diagnostic,
      reauthRequired: true,
      reauthReason: reason,
      reauthUrl,
    });
  }

  return { reauth_url: reauthUrl, reason, oauth_state_expires_at: stateExpiresAt };
}

export async function refreshAccessTokenIfNeeded(supabaseAdmin: any, cfg: MelhorEnvioConfig | null, force = false) {
  if (!cfg) return cfg;
  const expiresAt = cfg?.token_expires_at ? Date.parse(cfg.token_expires_at) : null;
  const stillValid = !expiresAt || expiresAt > Date.now() + 60_000;
  if (!force && stillValid) return cfg;
  if (!cfg.refresh_token || !cfg.client_id || !cfg.client_secret) return cfg;

  const env = cfg.environment ?? "sandbox";
  const endpoint = `${oauthBaseFor(env)}/oauth/token`;
  const method = "POST";

  try {
    const res = await fetch(endpoint, {
      method,
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
    const body = safeJson(text);

    if (!res.ok || !body?.access_token) {
      const reason = "Refresh token inválido/expirado. Reautorize o OAuth com os escopos atualizados.";
      if (res.status === 401 || res.status === 403) {
        await markMelhorEnvioRequiresOAuth(supabaseAdmin, cfg, reason, {
          ok: false,
          env,
          endpoint,
          method,
          status: res.status,
          responseBody: text,
        });
      } else {
        await recordMelhorEnvioDiagnostic(supabaseAdmin, {
          ok: false,
          env,
          endpoint,
          method,
          status: res.status,
          responseBody: text,
        });
      }
      return cfg;
    }

    const patch = {
      access_token: body.access_token,
      refresh_token: body.refresh_token ?? cfg.refresh_token,
      token_expires_at: tokenExpiryFrom(body.expires_in),
      oauth_scopes: MELHOR_ENVIO_SCOPE_TEXT,
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await supabaseAdmin.from("melhor_envio_config").update(patch as never).eq("id", true);
    await recordMelhorEnvioDiagnostic(supabaseAdmin, {
      ok: true,
      env,
      endpoint,
      method,
      status: res.status,
      responseBody: text,
    });
    return { ...cfg, ...patch };
  } catch (e) {
    await recordMelhorEnvioDiagnostic(supabaseAdmin, {
      ok: false,
      env,
      endpoint,
      method,
      status: 0,
      responseBody: e instanceof Error ? e.message : String(e),
    });
    return cfg;
  }
}

export async function melhorEnvioRequest(supabaseAdmin: any, cfg: MelhorEnvioConfig, input: MelhorEnvioRequestInput) {
  let activeCfg = await refreshAccessTokenIfNeeded(supabaseAdmin, cfg);
  const env = activeCfg?.environment ?? "sandbox";
  const method = input.method ?? "GET";
  const run = async (token: string) => {
    const res = await fetch(input.endpoint, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "Kairon Shopp (suporte@kaironshopp.com.br)",
      },
      body: input.requestPayload === undefined ? undefined : JSON.stringify(input.requestPayload),
    });
    const text = await res.text();
    return { res, text, json: safeJson(text) };
  };

  if (!activeCfg?.access_token) {
    return {
      ok: false,
      status: 0,
      text: "Access Token não configurado.",
      json: null,
      cfg: activeCfg,
      reauth_url: null,
      reauth_reason: "Access Token não configurado. Reautorize o OAuth.",
    };
  }

  let attempt = await run(activeCfg.access_token);
  if (attempt.res.status === 401 && activeCfg.refresh_token) {
    const refreshed = await refreshAccessTokenIfNeeded(supabaseAdmin, activeCfg, true);
    if (refreshed?.access_token && refreshed.access_token !== activeCfg.access_token) {
      activeCfg = refreshed;
      attempt = await run(activeCfg.access_token);
    }
  }

  const authFailure = attempt.res.status === 401 || attempt.res.status === 403;
  let reauth: Awaited<ReturnType<typeof markMelhorEnvioRequiresOAuth>> | null = null;
  if (authFailure) {
    const reason = attempt.res.status === 403
      ? "Token sem permissão para este endpoint ou ambiente incompatível. Reautorize com os escopos atualizados e confira Sandbox/Produção."
      : "Token inválido ou expirado. Reautorize o OAuth.";
    reauth = await markMelhorEnvioRequiresOAuth(supabaseAdmin, activeCfg, reason, {
      ok: false,
      env,
      endpoint: input.endpoint,
      method,
      status: attempt.res.status,
      responseBody: attempt.text,
      requestPayload: input.requestPayload,
    });
  } else {
    await recordMelhorEnvioDiagnostic(supabaseAdmin, {
      ok: attempt.res.ok,
      env,
      endpoint: input.endpoint,
      method,
      status: attempt.res.status,
      responseBody: attempt.text,
      requestPayload: input.requestPayload,
    });
  }

  return {
    ok: attempt.res.ok,
    status: attempt.res.status,
    text: attempt.text,
    json: attempt.json,
    cfg: activeCfg,
    reauth_url: reauth?.reauth_url ?? null,
    reauth_reason: reauth?.reason ?? null,
  };
}