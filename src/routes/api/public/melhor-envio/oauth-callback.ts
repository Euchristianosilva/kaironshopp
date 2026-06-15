import { createFileRoute } from "@tanstack/react-router";
import { MELHOR_ENVIO_SCOPE_TEXT, oauthBaseFor } from "@/lib/melhor-envio.shared";

function tokenExpiryFrom(expiresIn: unknown) {
  const seconds = typeof expiresIn === "number" ? expiresIn : Number(expiresIn ?? 0);
  return seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : null;
}

function redirectToAdmin(request: Request, status: "success" | "error", message?: string) {
  const url = new URL(request.url);
  const target = new URL("/admin/shipping", url.origin);
  target.searchParams.set("oauth", status);
  if (message) target.searchParams.set("message", message.slice(0, 180));
  return Response.redirect(target.toString(), 302);
}

export const Route = createFileRoute("/api/public/melhor-envio/oauth-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const providerError = url.searchParams.get("error") ?? url.searchParams.get("error_description");

        if (providerError) return redirectToAdmin(request, "error", providerError);
        if (!code || !state) return redirectToAdmin(request, "error", "Código de autorização ausente.");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: cfg, error: cfgError } = await supabaseAdmin
          .from("melhor_envio_config")
          .select("*")
          .eq("id", true)
          .maybeSingle();

        const row = (cfg ?? {}) as any;
        if (cfgError || !row.client_id || !row.client_secret || !row.callback_url) {
          return redirectToAdmin(request, "error", "Configuração inicial incompleta.");
        }
        if (row.oauth_state !== state) return redirectToAdmin(request, "error", "Sessão de autorização inválida.");
        if (row.oauth_state_expires_at && Date.parse(row.oauth_state_expires_at) <= Date.now()) {
          return redirectToAdmin(request, "error", "Sessão de autorização expirada. Tente novamente.");
        }

        const env = row.environment ?? "sandbox";
        const endpoint = `${oauthBaseFor(env)}/oauth/token`;
        const { recordMelhorEnvioDiagnostic } = await import("@/lib/melhor-envio.server");

        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": "Kairon Shopp (suporte@kaironshopp.com.br)",
            },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              client_id: row.client_id,
              client_secret: row.client_secret,
              redirect_uri: row.callback_url,
              code,
            }).toString(),
          });
          const text = await res.text();
          let body: any = null;
          try { body = JSON.parse(text); } catch {}

          if (!res.ok || !body?.access_token) {
            await recordMelhorEnvioDiagnostic(supabaseAdmin, {
              ok: false,
              env,
              endpoint,
              method: "POST",
              status: res.status,
              responseBody: text,
            });
            return redirectToAdmin(request, "error", "Não foi possível gerar os tokens.");
          }

          await supabaseAdmin.from("melhor_envio_config").update({
            access_token: body.access_token,
            refresh_token: body.refresh_token ?? row.refresh_token ?? null,
            token_expires_at: tokenExpiryFrom(body.expires_in),
            oauth_state: null,
            oauth_state_expires_at: null,
            oauth_scopes: MELHOR_ENVIO_SCOPE_TEXT,
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as never).eq("id", true);

          await recordMelhorEnvioDiagnostic(supabaseAdmin, {
            ok: true,
            env,
            endpoint,
            method: "POST",
            status: res.status,
            responseBody: text,
          });

          return redirectToAdmin(request, "success");
        } catch (e) {
          await recordMelhorEnvioDiagnostic(supabaseAdmin, {
            ok: false,
            env,
            endpoint,
            method: "POST",
            status: 0,
            responseBody: e instanceof Error ? e.message : String(e),
          });
          return redirectToAdmin(request, "error", "Falha ao concluir autorização.");
        }
      },
    },
  },
});