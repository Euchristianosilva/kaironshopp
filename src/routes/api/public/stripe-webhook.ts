import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.STRIPE_SECRET_KEY;
        const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!key || !whSecret) {
          return new Response("Stripe não configurado", { status: 500 });
        }

        const sig = request.headers.get("stripe-signature");
        if (!sig) return new Response("Sem assinatura", { status: 400 });

        const raw = await request.text();
        const stripe = new Stripe(key);

        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(raw, sig, whSecret);
        } catch (e: any) {
          console.error("webhook signature failed:", e.message);
          return new Response("Assinatura inválida", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotency
        const { error: dupErr } = await supabaseAdmin
          .from("stripe_events")
          .insert({ event_id: event.id, type: event.type, payload: event as any });
        if (dupErr && (dupErr as any).code === "23505") {
          return new Response("ok-duplicate");
        }

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const s = event.data.object as Stripe.Checkout.Session;
              const orderId = s.metadata?.order_id;
              if (orderId) {
                await supabaseAdmin
                  .from("orders")
                  .update({
                    payment_status: s.payment_status === "paid" ? "paid" : "pending",
                    status: s.payment_status === "paid" ? "paid" : "pending",
                    stripe_payment_intent_id: typeof s.payment_intent === "string" ? s.payment_intent : null,
                  })
                  .eq("id", orderId);
              }
              break;
            }
            case "payment_intent.succeeded": {
              const pi = event.data.object as Stripe.PaymentIntent;
              await supabaseAdmin
                .from("orders")
                .update({ payment_status: "paid", status: "paid" })
                .eq("stripe_payment_intent_id", pi.id);
              // Capture transfer id (destination charge creates a transfer)
              const charge = pi.latest_charge as string | null;
              if (charge) {
                try {
                  const ch = await stripe.charges.retrieve(charge as string);
                  const transferId = typeof ch.transfer === "string" ? ch.transfer : ch.transfer?.id;
                  if (transferId) {
                    const { data: order } = await supabaseAdmin
                      .from("orders")
                      .select("id")
                      .eq("stripe_payment_intent_id", pi.id)
                      .maybeSingle();
                    if (order) {
                      await supabaseAdmin
                        .from("order_items")
                        .update({ stripe_transfer_id: transferId })
                        .eq("order_id", order.id);
                    }
                  }
                } catch (e) {
                  console.error("charge retrieve failed:", e);
                }
              }
              break;
            }
            case "payment_intent.payment_failed": {
              const pi = event.data.object as Stripe.PaymentIntent;
              await supabaseAdmin
                .from("orders")
                .update({ payment_status: "failed", status: "canceled" })
                .eq("stripe_payment_intent_id", pi.id);
              break;
            }
            case "account.updated": {
              const acct = event.data.object as Stripe.Account;
              const status =
                acct.charges_enabled && acct.payouts_enabled
                  ? "active"
                  : acct.requirements?.disabled_reason || (acct.requirements?.currently_due?.length ?? 0) > 0
                  ? "restricted"
                  : "pending";
              await supabaseAdmin
                .from("sellers")
                .update({
                  stripe_charges_enabled: !!acct.charges_enabled,
                  stripe_payouts_enabled: !!acct.payouts_enabled,
                  stripe_onboarding_status: status,
                })
                .eq("stripe_account_id", acct.id);
              break;
            }
            case "transfer.created": {
              // Already captured via payment_intent.succeeded path; noop
              break;
            }
            case "payout.paid": {
              const p = event.data.object as Stripe.Payout;
              const acctId = (event as any).account as string | undefined;
              if (acctId) {
                const { data: seller } = await supabaseAdmin
                  .from("sellers")
                  .select("id")
                  .eq("stripe_account_id", acctId)
                  .maybeSingle();
                if (seller) {
                  await supabaseAdmin.from("payouts").insert({
                    seller_id: seller.id,
                    stripe_account_id: acctId,
                    stripe_payout_id: p.id,
                    amount_cents: p.amount,
                    currency: p.currency,
                    arrival_date: p.arrival_date ? new Date(p.arrival_date * 1000).toISOString() : null,
                    status: p.status,
                  });
                }
              }
              break;
            }
          }
        } catch (e: any) {
          console.error("webhook handler error:", e);
          // Remove the idempotency record so Stripe retry can re-process
          await supabaseAdmin.from("stripe_events").delete().eq("event_id", event.id);
          return new Response("erro interno", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});
