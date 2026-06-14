import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function meBaseFor(env: string) {
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

    const env = cfg?.environment ?? "sandbox";
    return {
      config: {
        environment: env,
        client_id: cfg?.client_id ?? "",
        client_secret_preview: mask(cfg?.client_secret),
        access_token_preview: mask(cfg?.access_token),
        refresh_token_preview: mask(cfg?.refresh_token),
        token_expires_at: cfg?.token_expires_at ?? null,
        callback_url: cfg?.callback_url ?? "",
        webhook_url: cfg?.webhook_url ?? "https://kaironshopp.lovable.app/api/public/melhor-envio/webhook",
        updated_at: cfg?.updated_at ?? null,
      },
      base_url: meBaseFor(env),
      diagnostics: diag ?? null,
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

export const pingMelhorEnvio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cfg } = await supabaseAdmin
      .from("melhor_envio_config")
      .select("*")
      .eq("id", true)
      .maybeSingle();

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
