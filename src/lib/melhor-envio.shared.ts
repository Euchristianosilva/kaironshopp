export const MELHOR_ENVIO_SCOPES = [
  "users-read",
  "shipping-calculate",
  "shipping-companies",
  "cart-read",
  "cart-write",
  "shipping-checkout",
  "shipping-generate",
  "shipping-preview",
  "shipping-print",
  "shipping-tracking",
  "orders-read",
  "ecommerce-shipping",
] as const;

export const MELHOR_ENVIO_SCOPE_TEXT = MELHOR_ENVIO_SCOPES.join(" ");

export const MELHOR_ENVIO_USER_AGENT = "Kairon Shopp (suporte@kaironshopp.com.br)";

export const MELHOR_ENVIO_ENDPOINT_AUDIT = [
  { path: "/api/v2/me", method: "GET", scope: "users-read", purpose: "validar usuário/token" },
  { path: "/api/v2/me/shipment", method: "GET", scope: "orders-read shipping-tracking", purpose: "consultar envios/etiquetas" },
  { path: "/api/v2/me/shipment/calculate", method: "POST", scope: "shipping-calculate", purpose: "calcular frete" },
  { path: "/api/v2/me/shipment/companies", method: "GET", scope: "shipping-companies", purpose: "consultar transportadoras" },
  { path: "/api/v2/me/cart", method: "GET/POST", scope: "cart-read cart-write", purpose: "consultar/inserir fretes no carrinho" },
  { path: "/api/v2/me/orders", method: "GET", scope: "orders-read", purpose: "consultar etiquetas/pedidos" },
  { path: "/api/v2/me/shipment/generate", method: "POST", scope: "shipping-generate", purpose: "gerar etiquetas" },
  { path: "/api/v2/me/shipment/tracking", method: "POST", scope: "shipping-tracking", purpose: "rastrear envios" },
] as const;

export function meBaseFor(env: string) {
  return env === "production"
    ? "https://www.melhorenvio.com.br/api/v2"
    : "https://sandbox.melhorenvio.com.br/api/v2";
}

export function oauthBaseFor(env: string) {
  return env === "production"
    ? "https://www.melhorenvio.com.br"
    : "https://sandbox.melhorenvio.com.br";
}