import { createFileRoute } from "@tanstack/react-router";

// Webhook público do Melhor Envio.
// Responde 200 em GET (validação do painel) e aceita POST com payload JSON.
// Por enquanto apenas registra o evento; o processamento de rastreio/etiquetas
// será adicionado em fases futuras.

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export const Route = createFileRoute("/api/public/melhor-envio/webhook")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(
          JSON.stringify({
            ok: true,
            service: "melhor-envio-webhook",
            message: "Webhook ativo. Aguardando eventos.",
          }),
          { status: 200, headers: JSON_HEADERS },
        );
      },
      HEAD: async () => new Response(null, { status: 200 }),
      POST: async ({ request }) => {
        let payload: unknown = null;
        try {
          const text = await request.text();
          payload = text ? JSON.parse(text) : null;
        } catch {
          payload = null;
        }
        // TODO: validar assinatura/HMAC quando o Melhor Envio expor o segredo
        // e despachar evento (tracking, posted, delivered, canceled etc.)
        console.log("[melhor-envio:webhook]", {
          at: new Date().toISOString(),
          event: (payload as { event?: string } | null)?.event ?? "unknown",
          payload,
        });
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: JSON_HEADERS,
        });
      },
    },
  },
});
