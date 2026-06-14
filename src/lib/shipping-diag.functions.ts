import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function meBase() {
  const env = (process.env.MELHOR_ENVIO_ENV ?? "sandbox").toLowerCase();
  return env === "production"
    ? "https://www.melhorenvio.com.br/api/v2"
    : "https://sandbox.melhorenvio.com.br/api/v2";
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !isAdmin) throw new Error("Forbidden");
}

export const getShippingDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("shipping_diagnostics")
      .select("*")
      .eq("id", true)
      .maybeSingle();

    const env = (process.env.MELHOR_ENVIO_ENV ?? "sandbox").toLowerCase();
    const token = process.env.MELHOR_ENVIO_TOKEN;
    return {
      env,
      base_url: meBase(),
      token_present: Boolean(token),
      token_preview: token ? `${token.slice(0, 6)}…${token.slice(-4)}` : null,
      webhook_url: "https://kaironshopp.lovable.app/api/public/melhor-envio/webhook",
      diagnostics: data ?? null,
    };
  });

export const pingMelhorEnvio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const token = process.env.MELHOR_ENVIO_TOKEN;
    const env = (process.env.MELHOR_ENVIO_ENV ?? "sandbox").toLowerCase();
    const base = meBase();
    const endpoint = `${base}/me`;

    if (!token) {
      return {
        ok: false,
        status: 0,
        env,
        endpoint,
        error: "MELHOR_ENVIO_TOKEN não configurado.",
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

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
        user: parsed && (parsed.email || parsed.name) ? { email: parsed.email, name: parsed.name } : null,
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
