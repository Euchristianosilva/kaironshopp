## Migração para Stripe Connect Express (Marketplace)

Vou implementar em fases para manter o app funcional a cada passo. Antes de começar, preciso confirmar alguns pontos.

### Perguntas

1. **Comissão da plataforma**: qual % padrão? (ex: 10%) — vou guardar em uma tabela `platform_settings` configurável depois.
2. **Webhook secret**: você vai precisar criar um endpoint webhook no painel do Stripe e me passar o `STRIPE_WEBHOOK_SECRET`. Posso te guiar quando chegarmos lá.
3. **País dos vendedores**: Brasil apenas? (Connect Express no BR tem regras específicas — exige `transfers` capability).
4. **Anúncios patrocinados**: já existem no app ou é só preparar a separação? (Não vi tabela `ads` — vou apenas garantir que o fluxo de Checkout para anúncios NÃO use `transfer_data`).

### Plano de implementação

**Fase 1 — Banco de dados** (migration única)
- `sellers`: adicionar `stripe_account_id`, `stripe_charges_enabled`, `stripe_payouts_enabled`, `stripe_onboarding_status` (`pending|restricted|active`).
- `platform_settings`: tabela singleton com `commission_percent` (default 10).
- `orders`: adicionar `stripe_session_id`, `stripe_payment_intent_id`, `status` (`pending|paid|failed|refunded`).
- `order_items`: adicionar `seller_id`, `stripe_account_id`, `platform_fee_cents`, `seller_net_cents`, `gross_cents`, `stripe_transfer_id`.
- `stripe_events`: log de eventos do webhook (idempotência por `event_id`).
- `payouts`: espelho de `payout.paid` por vendedor.
- RLS + GRANTs adequados; políticas: vendedor vê apenas seus dados, admin vê tudo via `has_role('admin')`.

**Fase 2 — Connect Onboarding** (server fns + UI)
- `createConnectAccount` (server fn): cria conta Express, salva `stripe_account_id`.
- `createConnectOnboardingLink`: retorna URL do Account Link.
- `refreshConnectStatus`: lê conta no Stripe e atualiza status local.
- UI: card no `/seller` mostrando status + botão "Configurar pagamentos" / "Continuar onboarding".

**Fase 3 — Checkout com split** (refatorar `checkout.functions.ts`)
- Agrupar itens do carrinho por `seller_id`.
- **Restrição**: Stripe Checkout com `payment_intent_data.transfer_data` só aceita **um destino** por sessão. Duas opções:
  - (A) Bloquear checkout multi-vendedor (mensagem "finalize uma loja por vez").
  - (B) Criar **uma sessão por vendedor** sequencialmente — UX ruim.
  - **Recomendo (A)** — padrão de marketplaces (iFood, MercadoLivre fazem o mesmo por loja).
- Calcular `application_fee_amount` = `gross * commission%`.
- Criar `order` + `order_items` com status `pending` antes de redirecionar.
- Bloquear checkout se vendedor não tiver `charges_enabled`.

**Fase 4 — Webhooks** (`/api/public/stripe-webhook`)
- Verificar assinatura com `STRIPE_WEBHOOK_SECRET`.
- Idempotência via `stripe_events`.
- Handlers: `checkout.session.completed` → marca order `paid`; `payment_intent.succeeded/failed` → atualiza status; `account.updated` → sincroniza status do vendedor; `transfer.created` → registra `stripe_transfer_id`; `payout.paid` → grava em `payouts`.

**Fase 5 — Painel financeiro do vendedor** (`/seller/finance`)
- Saldo disponível/pendente: `stripe.balance.retrieve({ stripeAccount })`.
- Vendas: query em `order_items` do vendedor.
- Transferências e payouts: `stripe.transfers.list` + tabela `payouts`.

**Fase 6 — Painel master** (`/admin/finance`)
- Comissão total (soma `platform_fee_cents`), vendas totais, repasses, histórico.
- Editor do `commission_percent`.

**Fase 7 — Anúncios patrocinados**
- Documentar/garantir que `createAdsCheckout` (quando existir) NÃO use `transfer_data` nem `application_fee_amount` — fica como checkout direto na conta da plataforma.

### Detalhes técnicos

- Stripe SDK já instalado.
- Server fns em `src/lib/*.functions.ts` (connect, checkout, finance).
- Webhook em `src/routes/api/public/stripe-webhook.ts` com `request.text()` para preservar o raw body.
- Todos os valores monetários em **centavos** (`integer`) no banco para evitar erro de float.
- `process.env.STRIPE_SECRET_KEY` (já configurado) + novo `STRIPE_WEBHOOK_SECRET`.

Confirma as 4 perguntas acima (especialmente comissão % e a decisão A/B do checkout multi-vendedor) e eu começo pela Fase 1?
