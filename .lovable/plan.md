## Contexto

A mensagem "Não foi possível calcular o frete agora" aparece quando a API do Melhor Envio responde **401/403**. O código da integração em `src/lib/shipping.functions.ts` já está correto:

- Endpoint certo: `POST /api/v2/me/shipment/calculate`
- Header `Authorization: Bearer <token>` + `User-Agent` (obrigatório pela ME)
- `from.postal_code`, `to.postal_code`, dimensões e peso em kg
- Cache, agrupamento por vendedor, validação de CEP de origem e dimensões

**Causa real do erro 401/403:** o token em `MELHOR_ENVIO_TOKEN` está inválido, expirado, sem os escopos certos, ou em ambiente diferente do configurado em `MELHOR_ENVIO_ENV`. Não é problema de OAuth nem de Client ID/Secret.

## Por que NÃO implementar OAuth completo agora

OAuth (Client ID + Secret + Refresh Token + Callback) só faz sentido quando **cada vendedor conecta a própria conta Melhor Envio**. Hoje a plataforma usa **um único token de plataforma** (modelo correto para marketplace que cobra/envia em nome próprio). Trocar para OAuth multi-conta é um projeto de dias e não resolve o erro atual — é apenas um caminho diferente para obter o mesmo `access_token`.

Mantemos o **Personal Access Token** (modelo single-tenant) e vamos:
1. Dar ao admin uma tela para ver o status e disparar diagnóstico
2. Logar erros com detalhes (status, endpoint, payload, resposta)
3. Validar dimensões/peso/CEP antes de enviar

## O que vou construir

### 1. Server fns de diagnóstico (`src/lib/shipping-diag.functions.ts`)
- `pingMelhorEnvio()` — chama `GET /api/v2/me` (endpoint leve que valida o token). Retorna `{ ok, status, env, user?, error? }`.
- `getShippingDiagnostics()` — retorna último erro armazenado, última cotação, ambiente atual, presença do token (sem expor valor).
- Ambas com `requireSupabaseAuth` + verificação `has_role(_, 'admin')`.

### 2. Persistência de diagnóstico (migration)
Tabela `shipping_diagnostics` com 1 linha (singleton):
- `last_success_at`, `last_error_at`, `last_error_status`, `last_error_endpoint`, `last_error_body`, `last_request_payload`, `last_env`
- RLS: apenas admin lê; `service_role` grava
- `shipping.functions.ts` passa a gravar erro/sucesso aqui

### 3. Logs detalhados em `shipping.functions.ts`
Já loga `status/env/body`. Vou adicionar: endpoint usado, payload enviado (sem dados sensíveis), e gravar no `shipping_diagnostics`.

### 4. Tela admin `/admin/shipping`
- Cartão "Status da Integração": ambiente, token presente, último sucesso, último erro
- Botão **Testar Conexão** → chama `pingMelhorEnvio()`
- Tabela com último payload enviado + resposta da API
- Instruções de como gerar/renovar o token (link para painel ME, escopos necessários)
- Campo informativo do Webhook URL: `https://kaironshopp.lovable.app/api/public/melhor-envio/webhook` (somente leitura, com botão copiar)

Os valores `MELHOR_ENVIO_TOKEN` e `MELHOR_ENVIO_ENV` continuam em **Secrets** (não em formulário do app) — é a forma segura no Lovable Cloud. A tela admin mostra status e instrui como atualizar.

### 5. Mensagens de erro mais úteis no carrinho
Em vez de "Tente novamente em instantes", quando o status for 401/403 mostrar: "Cálculo de frete temporariamente indisponível. Nossa equipe foi notificada." e logar o problema real no diagnóstico.

## Arquivos

```
+ supabase migration: shipping_diagnostics table
+ src/lib/shipping-diag.functions.ts
+ src/routes/admin.shipping.tsx
~ src/lib/shipping.functions.ts  (gravar diagnóstico + log de endpoint/payload)
~ src/routes/admin.tsx  (link "Frete / Melhor Envio" no menu)
```

## Próximo passo seu (independe de código)

Depois de eu publicar a tela admin, abra `/admin/shipping`, clique **Testar Conexão**. Se retornar 401:
1. Vá ao painel Melhor Envio (sandbox ou produção, conforme `MELHOR_ENVIO_ENV`)
2. Minha Conta → Tokens → gere novo token com escopos `shipping-calculate shipping-tracking cart-read cart-write`
3. Atualize o secret `MELHOR_ENVIO_TOKEN` (eu peço com a ferramenta de secrets)

Posso prosseguir?
