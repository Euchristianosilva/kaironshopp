# Sistema de Produtos Patrocinados — Plano em 5 Fases

Implementação dividida para entregar valor incrementalmente. Cada fase termina funcional e testável.

---

## Fase 1 — Banco de dados e preços (fundação)

**Entrega:** estrutura no backend, sem UI nova.

Tabelas novas (todas com RLS + GRANTs):

- `ad_pricing` — preços configuráveis pelo admin
  - `placement` (`card` | `carousel`)
  - `price_per_hour`, `price_per_day`, `price_per_week` (centavos)
  - Seed: card R$ 20/dia (≈ R$ 0,83/h); carousel R$ 83,33/dia (R$ 250 / 3 dias)

- `ad_campaigns` — campanhas patrocinadas
  - `product_id`, `seller_id`, `placement`, `starts_at`, `ends_at`
  - `amount_cents`, `currency`, `status` (`pending_payment` | `scheduled` | `active` | `ended` | `canceled` | `refunded` | `rejected`)
  - `stripe_session_id`, `stripe_payment_intent_id`, `paid_at`
  - `priority` (admin pode ajustar para ordenação)

- `ad_metrics` — visualizações/cliques agregados por campanha/dia
  - `campaign_id`, `date`, `impressions`, `clicks`, `conversions`, `revenue_cents`

Políticas:
- Vendedor lê/cria as próprias campanhas; admin lê tudo.
- `ad_pricing` leitura pública (autenticados), escrita só admin.
- `ad_metrics` leitura pelo dono da campanha e admin.

---

## Fase 2 — Modal "🚀 Turbinar Produto" + Stripe Checkout

**Entrega:** vendedor consegue contratar e pagar uma campanha.

- Botão "🚀 Turbinar" na linha do produto em `seller.products.tsx` (só para produtos ativos e com estoque).
- Modal `TurbinarProductDialog`:
  - Mostra foto/nome/preço do produto.
  - Seletor de tipo (card ⭐ ou carrossel 🔥) com preço por dia.
  - Datepickers: início e fim (data + hora).
  - Cálculo automático: dias, horas, total (busca `ad_pricing`).
  - Resumo do pedido.
  - Botão "Pagar com Stripe".
- Server function `createAdCheckout` (`requireSupabaseAuth`):
  - Valida: produto pertence ao vendedor, ativo, com estoque, datas válidas, sem conflito de período no mesmo placement+produto.
  - Cria `ad_campaigns` com status `pending_payment`.
  - Cria Stripe Checkout Session (mode `payment`, `price_data` com o valor calculado, metadata com `campaign_id`).
  - Retorna URL → abre em nova aba.
- Webhook `/api/public/stripe/ads-webhook`:
  - Verifica assinatura (`STRIPE_WEBHOOK_SECRET`).
  - Em `checkout.session.completed`: marca campanha como `scheduled` (ou `active` se `starts_at <= now`), grava `paid_at`.
  - Idempotente via `stripe_events`.

---

## Fase 3 — Automação (ativar/encerrar)

**Entrega:** anúncios entram e saem do ar sozinhos.

- Rota `/api/public/hooks/ad-scheduler` (POST, valida `apikey` header).
  - `UPDATE ad_campaigns SET status='active' WHERE status='scheduled' AND starts_at <= now()`
  - `UPDATE ad_campaigns SET status='ended' WHERE status='active' AND ends_at <= now()`
- `pg_cron` a cada 5 minutos chamando a rota.

---

## Fase 4 — Marketplace (exibição + tracking)

**Entrega:** produtos patrocinados aparecem para os compradores.

- Server fn `getActiveSponsoredProducts({ placement, categoryId? })`:
  - Retorna produtos com campanhas ativas, ordenados por `priority DESC, amount_cents DESC`.
- Componentes:
  - `SponsoredCarousel` — usado no topo da home.
  - `SponsoredProductCard` — variante do card com selo "PATROCINADO".
  - Integração na home, listagem de categorias e busca (mistura ~2-3 patrocinados entre os orgânicos).
- Server fn `trackAdImpression` e `trackAdClick` — gravam em `ad_metrics` (upsert por dia).
  - Impressão registrada via IntersectionObserver no card.
  - Clique registrado no handler do Link.

---

## Fase 5 — Painel admin + relatórios

**Entrega:** admin gerencia campanhas e preços; vendedor vê métricas.

- `/admin/ads`:
  - Lista campanhas (filtros por status, vendedor, placement).
  - Ações: aprovar, pausar (`active` → `scheduled` com flag), cancelar, reembolsar (chama Stripe refunds + marca `refunded`).
- `/admin/ads/pricing`:
  - Editor dos valores em `ad_pricing`.
- `/seller/promotions` (já existe a rota — usaremos):
  - Lista campanhas do vendedor com métricas: impressões, cliques, CTR, vendas atribuídas, ROI.
- Dashboard admin: receita total de anúncios, top vendedores, top produtos, faturamento mensal.

---

## Detalhes técnicos

- Stripe: usa secret já presente (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`). Webhook novo dedicado a ads, separado do webhook de pedidos.
- Conflito de datas: índice + checagem na server fn (`tstzrange` overlap por `product_id` + `placement` em campanhas não canceladas).
- Atribuição de vendas: order_items com `sponsored_campaign_id` (gravado quando o checkout do comprador originou de um clique rastreado — guardado em sessionStorage).
- Selo "PATROCINADO" visível, acessível (`aria-label`).
- Sem alteração em código auto-gerado (`client.ts`, `types.ts`, etc).

---

## Próximo passo

Aprovando, começo pela **Fase 1** (migration com tabelas, preços e políticas). Depois seguimos uma fase por turno — você testa entre elas.
