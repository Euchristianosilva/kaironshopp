import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { meBaseFor } from "@/lib/melhor-envio.shared";

const ItemSchema = z.object({ product_id: z.string().uuid(), qty: z.number().int().min(1).max(999) });
const CalcInput = z.object({
  to_zip: z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido"),
  items: z.array(ItemSchema).min(1).max(50),
});

type Quote = {
  seller_id: string;
  seller_name: string;
  origin_zip: string | null;
  options: Array<{
    id: number | string;
    name: string;
    company: string;
    price: number;
    delivery_time: number;
    error?: string;
  }>;
  error?: string;
};

export const calculateShipping = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CalcInput.parse(d))
  .handler(async ({ data }): Promise<{ quotes: Quote[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { melhorEnvioRequest, refreshAccessTokenIfNeeded } = await import("@/lib/melhor-envio.server");

    const { data: cfgRow } = await supabaseAdmin
      .from("melhor_envio_config")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    const cfg = await refreshAccessTokenIfNeeded(supabaseAdmin, cfgRow as any);
    const token = cfg?.access_token;
    const env = cfg?.environment ?? "sandbox";
    if (!token) throw new Error("Integração Melhor Envio não configurada pelo administrador.");
    const baseUrl = meBaseFor(env);


    const ids = data.items.map((i) => i.product_id);
    const { data: products, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id, seller_id, title, price, weight_g, height_cm, width_cm, length_cm")
      .in("id", ids);
    if (pErr) throw new Error(pErr.message);
    if (!products?.length) throw new Error("Produtos não encontrados.");

    const sellerIds = Array.from(new Set(products.map((p) => p.seller_id).filter(Boolean) as string[]));
    const { data: sellers } = await supabaseAdmin
      .from("sellers")
      .select("id, name, origin_zip")
      .in("id", sellerIds);
    const sellerMap = new Map((sellers ?? []).map((s) => [s.id, s] as const));

    const toZip = data.to_zip.replace(/\D/g, "");
    const groups = new Map<string, typeof data.items>();
    for (const it of data.items) {
      const p = products.find((x) => x.id === it.product_id);
      if (!p?.seller_id) continue;
      const arr = groups.get(p.seller_id) ?? [];
      arr.push(it);
      groups.set(p.seller_id, arr);
    }

    const quotes: Quote[] = [];
    for (const [sellerId, items] of groups) {
      const seller = sellerMap.get(sellerId);
      const sellerProducts = items
        .map((it) => ({ it, p: products.find((x) => x.id === it.product_id)! }))
        .filter((x) => x.p);
      const fromZip = (seller?.origin_zip ?? "").replace(/\D/g, "");

      if (!fromZip || fromZip.length !== 8) {
        quotes.push({
          seller_id: sellerId,
          seller_name: seller?.name ?? "Loja",
          origin_zip: null,
          options: [],
          error: "Esta loja ainda não cadastrou o CEP de origem em Configurações de Envio.",
        });
        continue;
      }

      const missingDims = sellerProducts.some(
        (x) => !x.p.weight_g || !x.p.height_cm || !x.p.width_cm || !x.p.length_cm,
      );
      if (missingDims) {
        quotes.push({
          seller_id: sellerId,
          seller_name: seller?.name ?? "Loja",
          origin_zip: fromZip,
          options: [],
          error: "Produto(s) sem peso/dimensões cadastrados.",
        });
        continue;
      }

      const meProducts = sellerProducts.map(({ it, p }) => ({
        id: p.id,
        width: Number(p.width_cm),
        height: Number(p.height_cm),
        length: Number(p.length_cm),
        weight: Number(p.weight_g) / 1000,
        insurance_value: Number(p.price) * it.qty,
        quantity: it.qty,
      }));

      const cacheKey = `me:${fromZip}:${toZip}:${meProducts
        .map((p) => `${p.id}x${p.quantity}`)
        .sort()
        .join(",")}`;

      const { data: cached } = await supabaseAdmin
        .from("shipping_quotes_cache")
        .select("payload, expires_at")
        .eq("cache_key", cacheKey)
        .maybeSingle();

      let options: Quote["options"] = [];
      if (cached && new Date(cached.expires_at) > new Date()) {
        options = cached.payload as Quote["options"];
      } else {
        const endpoint = `${baseUrl}/me/shipment/calculate`;
        const payload = {
          from: { postal_code: fromZip },
          to: { postal_code: toZip },
          products: meProducts,
        };
        try {
          const result = await melhorEnvioRequest(supabaseAdmin, cfg as any, {
            endpoint,
            method: "POST",
            requestPayload: payload,
          });
          if (!result.ok) {
            const txt = result.text;
            console.error("[melhor-envio] calculate failed", {
              status: result.status,
              env,
              endpoint,
              payload,
              body: txt.slice(0, 500),
            });
            let friendly: string;
            if (result.status === 401 || result.status === 403) {
              friendly = "Integração de frete precisa ser reautorizada pelo administrador.";
            } else if (result.status === 422) {
              friendly = "Não foi possível calcular o frete para este endereço.";
            } else {
              friendly = "Frete temporariamente indisponível. Tente novamente.";
            }
            quotes.push({
              seller_id: sellerId,
              seller_name: seller?.name ?? "Loja",
              origin_zip: fromZip,
              options: [],
              error: friendly,
            });
            continue;
          }
          const raw = (Array.isArray(result.json) ? result.json : []) as Array<{
            id: number;
            name: string;
            price?: string;
            delivery_time?: number;
            company?: { name?: string };
            error?: string;
          }>;
          options = raw.map((o) => ({
            id: o.id,
            name: o.name,
            company: o.company?.name ?? "",
            price: Number(o.price ?? 0),
            delivery_time: Number(o.delivery_time ?? 0),
            error: o.error,
          })).filter((o) => !o.error && o.price > 0);

          await supabaseAdmin.from("shipping_quotes_cache").upsert(
            {
              cache_key: cacheKey,
              payload: options as never,
              expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
            },
            { onConflict: "cache_key" },
          );
          await supabaseAdmin.from("shipping_diagnostics").upsert({
            id: true,
            last_success_at: new Date().toISOString(),
            last_env: env,
            updated_at: new Date().toISOString(),
          });
        } catch (e) {
          console.error("[melhor-envio] calculate threw", { endpoint, env, error: e });
          await supabaseAdmin.from("shipping_diagnostics").upsert({
            id: true,
            last_error_at: new Date().toISOString(),
            last_error_status: 0,
            last_error_endpoint: endpoint,
            last_error_body: e instanceof Error ? e.message : String(e),
            last_request_payload: payload as never,
            last_env: env,
            updated_at: new Date().toISOString(),
          });
          quotes.push({
            seller_id: sellerId,
            seller_name: seller?.name ?? "Loja",
            origin_zip: fromZip,
            options: [],
            error: "Frete temporariamente indisponível. Tente novamente.",
          });
          continue;
        }
      }

      quotes.push({
        seller_id: sellerId,
        seller_name: seller?.name ?? "Loja",
        origin_zip: fromZip,
        options,
      });
    }

    return { quotes };
  });
