import { createServerFn } from "@tanstack/react-start";
import Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Placement = "card" | "carousel";

function maskStripeId(id: string | null | undefined) {
  if (!id) return null;
  return `${id.slice(0, 10)}…${id.slice(-4)}`;
}

function stripeKeyMode(key: string) {
  if (key.startsWith("sk_test_")) return "test";
  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("pk_")) return "publishable_key_invalid_for_server";
  if (key.startsWith("rk_")) return "restricted_key_may_fail";
  return "unknown";
}

function normalizeCheckoutOrigin(origin: string) {
  const parsed = new URL(origin);
  const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !(isLocalhost && parsed.protocol === "http:")) {
    throw new Error("Origem inválida para redirecionamento do Stripe");
  }
  return parsed.origin;
}

function validStripeImage(url: string | null | undefined) {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? [url] : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Cria uma campanha de anúncio patrocinado (status pending_payment)
 * e inicia uma Stripe Checkout Session. O webhook confirma o pagamento
 * e ativa/programa a campanha.
 */
export const createAdCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      productId: string;
      placement: Placement;
      startsAt: string; // ISO
      endsAt: string;   // ISO
      origin: string;
    }) => {
      if (!input.productId) throw new Error("productId obrigatório");
      if (input.placement !== "card" && input.placement !== "carousel") {
        throw new Error("placement inválido");
      }
      const s = new Date(input.startsAt);
      const e = new Date(input.endsAt);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
        throw new Error("Datas inválidas");
      }
      if (e <= s) throw new Error("Data final deve ser após a inicial");
      const now = Date.now();
      if (s.getTime() < now - 60_000) {
        throw new Error("A data de início não pode estar no passado");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY não configurada");
    const keyMode = stripeKeyMode(key);
    if (keyMode === "publishable_key_invalid_for_server") {
      throw new Error("STRIPE_SECRET_KEY está configurada com chave publicável (pk_). Use uma chave secreta sk_test_ ou sk_live_.");
    }
    if (keyMode === "unknown") {
      throw new Error("STRIPE_SECRET_KEY possui formato inválido. Use uma chave secreta sk_test_ ou sk_live_.");
    }

    const { supabase, userId } = context;
    const checkoutOrigin = normalizeCheckoutOrigin(data.origin);
    const stripe = new Stripe(key);
    console.info("[ad-checkout] start", {
      userId,
      productId: data.productId,
      placement: data.placement,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      origin: checkoutOrigin,
      stripeMode: keyMode,
      hasPublishableKey: Boolean(process.env.STRIPE_PUBLISHABLE_KEY),
    });

    // 1) Carregar produto e validar propriedade/estado
    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("id, title, image_url, price, stock, is_active, seller_id, sellers!inner(id, owner_id)")
      .eq("id", data.productId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!product) throw new Error("Produto não encontrado");
    const seller = (product as any).sellers;
    if (!seller || seller.owner_id !== userId) {
      throw new Error("Você não é o dono deste produto");
    }
    if (!product.is_active) throw new Error("Produto inativo não pode ser turbinado");
    if ((product.stock ?? 0) <= 0) throw new Error("Produto sem estoque");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 2) Limpar tentativas antigas/sem sessão e tratar retentativas com sessão aberta
    await supabaseAdmin
      .from("ad_campaigns")
      .update({
        status: "canceled",
        canceled_at: new Date().toISOString(),
        metadata: { checkout_error: "stale_pending_payment_without_stripe_session" },
      } as any)
      .eq("product_id", product.id)
      .eq("placement", data.placement)
      .eq("owner_id", userId)
      .eq("status", "pending_payment")
      .is("stripe_session_id", null);

    const { data: conflicts } = await supabaseAdmin
      .from("ad_campaigns")
      .select("id, starts_at, ends_at, status, stripe_session_id")
      .eq("product_id", product.id)
      .eq("placement", data.placement)
      .in("status", ["pending_payment", "scheduled", "active"]);
    const startMs = new Date(data.startsAt).getTime();
    const endMs = new Date(data.endsAt).getTime();
    const overlap = (conflicts ?? []).find((c) => {
      const cs = new Date(c.starts_at).getTime();
      const ce = new Date(c.ends_at).getTime();
      return cs < endMs && ce > startMs;
    });
    if (overlap) {
      if (overlap.status === "pending_payment" && (overlap as any).stripe_session_id) {
        const existingSession = await stripe.checkout.sessions.retrieve((overlap as any).stripe_session_id);
        console.info("[ad-checkout] existing_session", {
          campaignId: overlap.id,
          sessionId: maskStripeId(existingSession.id),
          sessionStatus: existingSession.status,
          paymentStatus: existingSession.payment_status,
          hasUrl: Boolean(existingSession.url),
        });
        if (existingSession.status === "open" && existingSession.url) {
          return { url: existingSession.url, campaignId: overlap.id, amountCents: existingSession.amount_total ?? 0 };
        }
        await supabaseAdmin
          .from("ad_campaigns")
          .update({ status: "canceled", canceled_at: new Date().toISOString() } as any)
          .eq("id", overlap.id);
      } else {
        throw new Error("Já existe um anúncio ativo/agendado neste período para este produto");
      }
    }

    // 3) Buscar preço
    const { data: pricing, error: prErr } = await supabase
      .from("ad_pricing")
      .select("price_per_hour_cents, price_per_day_cents, currency")
      .eq("placement", data.placement)
      .maybeSingle();
    if (prErr) throw prErr;
    if (!pricing) throw new Error("Preços não configurados");

    const hours = Math.ceil((endMs - startMs) / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const extraHours = hours - days * 24;
    const amountCents =
      days * pricing.price_per_day_cents + extraHours * pricing.price_per_hour_cents;
    if (amountCents < 100) throw new Error("Valor mínimo do anúncio é R$ 1,00");

    // 4) Criar campanha pending_payment
    const { data: campaign, error: cErr } = await supabaseAdmin
      .from("ad_campaigns")
      .insert({
        product_id: product.id,
        seller_id: seller.id,
        owner_id: userId,
        placement: data.placement,
        starts_at: data.startsAt,
        ends_at: data.endsAt,
        amount_cents: amountCents,
        currency: pricing.currency || "brl",
        status: "pending_payment",
        metadata: data.placement === "carousel" ? { admin_status: "awaiting_payment" } : {},
      })
      .select("id")
      .single();
    if (cErr) throw cErr;

    // 5) Stripe Checkout
    const placementLabel = data.placement === "carousel" ? "Carrossel Principal" : "Card Patrocinado";
    try {
      console.info("[ad-checkout] creating_stripe_session", { campaignId: campaign.id, amountCents, currency: pricing.currency || "brl" });
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: pricing.currency || "brl",
              product_data: {
                name: `Anúncio ${placementLabel} — ${product.title}`,
                images: validStripeImage(product.image_url),
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        metadata: {
          kind: "ad_campaign",
          placement: data.placement,
          campaign_id: campaign.id,
          product_id: product.id,
          user_id: userId,
        },
        success_url: `${checkoutOrigin}/seller/promotions?ads=success`,
        cancel_url: `${checkoutOrigin}/seller/promotions?ads=canceled`,
      });

      const { error: sessionUpdateErr } = await supabaseAdmin
        .from("ad_campaigns")
        .update({ stripe_session_id: session.id })
        .eq("id", campaign.id);
      if (sessionUpdateErr) throw sessionUpdateErr;

      if (!session.url) throw new Error("Stripe não retornou a URL de pagamento");
      console.info("[ad-checkout] session_created", {
        campaignId: campaign.id,
        sessionId: maskStripeId(session.id),
        amountCents,
        hasUrl: Boolean(session.url),
      });
      return { url: session.url, campaignId: campaign.id, amountCents };
    } catch (error) {
      console.error("[ad-checkout] stripe_session_failed", {
        campaignId: campaign.id,
        message: error instanceof Error ? error.message : String(error),
      });
      await supabaseAdmin
        .from("ad_campaigns")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
          metadata: { checkout_error: error instanceof Error ? error.message : "stripe_checkout_failed" },
        })
        .eq("id", campaign.id);
      throw error;
    }
  });

/**
 * Busca os preços vigentes para o cálculo do modal.
 */
export const getAdPricing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ad_pricing")
      .select("placement, price_per_hour_cents, price_per_day_cents, price_per_week_cents, currency");
    if (error) throw error;
    return data ?? [];
  });

/**
 * Lista campanhas do vendedor logado com totais de métricas.
 */
export const listMyAdCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: campaigns, error } = await supabase
      .from("ad_campaigns")
      .select("id, placement, status, starts_at, ends_at, amount_cents, currency, product_id, products(title, image_url)")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const ids = (campaigns ?? []).map((c: any) => c.id);
    let metricsByCampaign: Record<string, { impressions: number; clicks: number }> = {};
    if (ids.length) {
      const { data: m } = await supabase
        .from("ad_metrics")
        .select("campaign_id, impressions, clicks")
        .in("campaign_id", ids);
      for (const row of m ?? []) {
        const k = (row as any).campaign_id as string;
        const cur = metricsByCampaign[k] ?? { impressions: 0, clicks: 0 };
        cur.impressions += (row as any).impressions ?? 0;
        cur.clicks += (row as any).clicks ?? 0;
        metricsByCampaign[k] = cur;
      }
    }
    return (campaigns ?? []).map((c: any) => ({
      ...c,
      metrics: metricsByCampaign[c.id] ?? { impressions: 0, clicks: 0 },
    }));
  });

/**
 * Admin: lista todas as campanhas com métricas.
 */
export const listAllAdCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as any)?.email as string | undefined;
    const { assertAdminAccess } = await import("@/lib/admin-auth.server");
    await assertAdminAccess(context.userId, email);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: campaigns, error } = await supabaseAdmin
      .from("ad_campaigns")
      .select("id, placement, status, starts_at, ends_at, amount_cents, currency, owner_id, product_id, image_url, products(title, image_url), sellers(name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const ids = (campaigns ?? []).map((c: any) => c.id);
    let metricsByCampaign: Record<string, { impressions: number; clicks: number }> = {};
    if (ids.length) {
      const { data: m } = await supabaseAdmin
        .from("ad_metrics")
        .select("campaign_id, impressions, clicks")
        .in("campaign_id", ids);
      for (const row of m ?? []) {
        const k = (row as any).campaign_id as string;
        const cur = metricsByCampaign[k] ?? { impressions: 0, clicks: 0 };
        cur.impressions += (row as any).impressions ?? 0;
        cur.clicks += (row as any).clicks ?? 0;
        metricsByCampaign[k] = cur;
      }
    }
    return (campaigns ?? []).map((c: any) => ({
      ...c,
      metrics: metricsByCampaign[c.id] ?? { impressions: 0, clicks: 0 },
    }));
  });

export const listPremiumCarouselRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as any)?.email as string | undefined;
    const { assertAdminAccess } = await import("@/lib/admin-auth.server");
    await assertAdminAccess(context.userId, email);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("ad_campaigns")
      .select("id, status, starts_at, ends_at, amount_cents, currency, paid_at, created_at, metadata, products(title, image_url), sellers(name)")
      .eq("placement", "carousel")
      .or("paid_at.not.is.null,is_manual.eq.true")
      .order("paid_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  });

export const adminReviewPremiumCarousel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { campaignId: string; action: "approve" | "reject" | "remove" }) => {
    if (!input.campaignId) throw new Error("campaignId obrigatório");
    if (!["approve", "reject", "remove"].includes(input.action)) throw new Error("Ação inválida");
    return input;
  })
  .handler(async ({ data, context }) => {
    const email = (context.claims as any)?.email as string | undefined;
    const { assertAdminAccess } = await import("@/lib/admin-auth.server");
    await assertAdminAccess(context.userId, email);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: campaign, error: readErr } = await supabaseAdmin
      .from("ad_campaigns")
      .select("id, placement, starts_at, ends_at, metadata")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!campaign || campaign.placement !== "carousel") throw new Error("Solicitação não encontrada");

    const now = new Date();
    const startsAt = new Date(campaign.starts_at).getTime();
    const endsAt = new Date(campaign.ends_at).getTime();
    const currentMetadata = ((campaign as any).metadata ?? {}) as Record<string, unknown>;
    const update: any = {
      metadata: { ...currentMetadata, reviewed_by: context.userId, reviewed_at: now.toISOString(), admin_action: data.action },
    };
    if (data.action === "approve") {
      update.status = startsAt <= now.getTime() && endsAt > now.getTime() ? "active" : "scheduled";
      update.activated_by = context.userId;
      update.activated_at = now.toISOString();
      update.metadata = { ...(update.metadata as Record<string, unknown>), admin_status: "approved" };
    } else if (data.action === "reject") {
      update.status = "rejected";
      update.metadata = { ...(update.metadata as Record<string, unknown>), admin_status: "rejected" };
    } else {
      update.status = "canceled";
      update.canceled_at = now.toISOString();
      update.metadata = { ...(update.metadata as Record<string, unknown>), admin_status: "removed" };
    }

    const { error } = await supabaseAdmin.from("ad_campaigns").update(update as any).eq("id", data.campaignId);
    if (error) throw error;
    return { ok: true };
  });

/**
 * Admin: altera status de uma campanha (pausar/cancelar/encerrar).
 */
export const adminUpdateCampaignStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { campaignId: string; status: "scheduled" | "active" | "ended" | "canceled" | "rejected" }) => {
    const allowed = ["scheduled", "active", "ended", "canceled", "rejected"];
    if (!allowed.includes(input.status)) throw new Error("Status inválido");
    if (!input.campaignId) throw new Error("campaignId obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    const email = (context.claims as any)?.email as string | undefined;
    const { assertAdminAccess } = await import("@/lib/admin-auth.server");
    await assertAdminAccess(context.userId, email);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("ad_campaigns")
      .update({ status: data.status })
      .eq("id", data.campaignId);
    if (error) throw error;
    return { ok: true };
  });

const MANUAL_PLACEMENTS = [
  "banner_principal",
  "destaque_home",
  "patrocinado",
  "vitrine_topo",
  "categoria",
  "busca",
  "premium",
  "card",
  "carousel",
] as const;
type ManualPlacement = (typeof MANUAL_PLACEMENTS)[number];

/**
 * Admin: ativa um anúncio manualmente (sem pagamento). Cria a campanha
 * já com status=active, registra autor e timestamp.
 */
export const createManualAdCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    productId: string;
    placement: ManualPlacement;
    startsAt?: string;
    endsAt?: string;
    priority?: number;
    imageUrl?: string | null;
  }) => {
    if (!input.productId) throw new Error("productId obrigatório");
    if (!MANUAL_PLACEMENTS.includes(input.placement)) throw new Error("Posição inválida");
    return input;
  })
  .handler(async ({ data, context }) => {
    const email = (context.claims as any)?.email as string | undefined;
    const { assertAdminAccess } = await import("@/lib/admin-auth.server");
    await assertAdminAccess(context.userId, email);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: product, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id, seller_id, sellers!inner(id, owner_id)")
      .eq("id", data.productId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!product) throw new Error("Produto não encontrado");

    const starts = data.startsAt ? new Date(data.startsAt) : new Date();
    const ends = data.endsAt ? new Date(data.endsAt) : new Date(starts.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (ends <= starts) throw new Error("Data final deve ser após a inicial");

    const seller = (product as any).sellers;
    const now = new Date().toISOString();
    const { data: campaign, error: cErr } = await supabaseAdmin
      .from("ad_campaigns")
      .insert({
        product_id: product.id,
        seller_id: seller.id,
        owner_id: seller.owner_id,
        placement: data.placement,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        amount_cents: 0,
        currency: "brl",
        status: "active",
        priority: data.priority ?? 100,
        paid_at: now,
        is_manual: true,
        activated_by: context.userId,
        activated_at: now,
        metadata: { manual: true, activated_by_email: email ?? null },
        image_url: data.imageUrl ?? null,
      })
      .select("id")
      .single();
    if (cErr) throw cErr;
    return { ok: true, campaignId: campaign.id };
  });

