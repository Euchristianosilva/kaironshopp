import { createServerFn } from "@tanstack/react-start";
import Stripe from "stripe";

type Item = { name: string; image?: string; price: number; qty: number };

export const createStripeCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: { items: Item[]; origin: string }) => input)
  .handler(async ({ data }) => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY não configurada");
    if (!data.items?.length) throw new Error("Carrinho vazio");

    const stripe = new Stripe(key);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: data.items.map((i) => ({
        price_data: {
          currency: "brl",
          product_data: { name: i.name, images: i.image ? [i.image] : undefined },
          unit_amount: Math.round(i.price * 100),
        },
        quantity: i.qty,
      })),
      success_url: `${data.origin}/account?payment=success`,
      cancel_url: `${data.origin}/checkout?payment=canceled`,
    });

    return { url: session.url };
  });
