import { createServerFn } from "@tanstack/react-start";
import Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada");
  return new Stripe(key);
}

async function getSellerForUser(supabase: any, _userId: string) {
  const { data, error } = await supabase.rpc("get_my_seller");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Loja não encontrada. Crie sua loja primeiro.");
  return data;
}

function mapStatus(acct: Stripe.Account): "pending" | "restricted" | "active" {
  if (acct.charges_enabled && acct.payouts_enabled) return "active";
  if (acct.requirements?.disabled_reason || (acct.requirements?.currently_due?.length ?? 0) > 0) return "restricted";
  return "pending";
}

export const createConnectAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { origin: string }) => i)
  .handler(async ({ data, context }) => {
    const stripe = stripeClient();
    const seller = await getSellerForUser(context.supabase, context.userId);

    let accountId = seller.stripe_account_id as string | null;
    if (!accountId) {
      const acct = await stripe.accounts.create({
        type: "express",
        country: "BR",
        capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
        business_type: "individual",
        metadata: { seller_id: seller.id, owner_id: context.userId },
      });
      accountId = acct.id;
      await context.supabase
        .from("sellers")
        .update({ stripe_account_id: accountId })
        .eq("id", seller.id);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${data.origin}/seller?connect=refresh`,
      return_url: `${data.origin}/seller?connect=return`,
      type: "account_onboarding",
    });

    return { url: link.url };
  });

export const refreshConnectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const stripe = stripeClient();
    const seller = await getSellerForUser(context.supabase, context.userId);
    if (!seller.stripe_account_id) return { status: "pending", charges_enabled: false, payouts_enabled: false };

    const acct = await stripe.accounts.retrieve(seller.stripe_account_id);
    const status = mapStatus(acct);
    await context.supabase
      .from("sellers")
      .update({
        stripe_charges_enabled: !!acct.charges_enabled,
        stripe_payouts_enabled: !!acct.payouts_enabled,
        stripe_onboarding_status: status,
      })
      .eq("id", seller.id);

    return {
      status,
      charges_enabled: !!acct.charges_enabled,
      payouts_enabled: !!acct.payouts_enabled,
    };
  });

export const createExpressDashboardLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const stripe = stripeClient();
    const seller = await getSellerForUser(context.supabase, context.userId);
    if (!seller.stripe_account_id) throw new Error("Conta Stripe Connect não criada");
    const link = await stripe.accounts.createLoginLink(seller.stripe_account_id);
    return { url: link.url };
  });
