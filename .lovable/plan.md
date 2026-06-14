## Objetivo
Transformar o Painel do Vendedor em uma experiência tipo Shopee/Mercado Livre: sidebar fixa categorizada, dashboard com métricas reais, todas as páginas funcionais conectadas ao Supabase, design premium SaaS.

## Arquitetura nova

### 1. Layout com sidebar (nova base)
- `src/routes/seller.tsx` vira **layout** (`<Outlet />`) com sidebar fixa colapsável usando shadcn `Sidebar`
- Sidebar agrupada em: **Vendas** (Dashboard, Pedidos, Produtos, Estoque, Categorias) · **Marketing** (Cupons, Promoções, Avaliações) · **Clientes** (Clientes, Mensagens) · **Logística** (Fretes, Envios) · **Financeiro** (Carteira, Extrato, Recebimentos, Saques) · **Conta** (Perfil, Configurações, Assinatura, Ajuda)
- Header interno com nome da loja, status Stripe, botão "Novo produto"
- Onboarding (criar loja + Stripe Connect) permanece como gate antes do dashboard

### 2. Dashboard `/seller` (index)
Novo arquivo `seller.index.tsx` com cards de KPIs reais via novo `src/lib/seller-dashboard.functions.ts`:
- Total de vendas, pedidos pendentes/enviados, produtos ativos/pausados, estoque baixo, faturamento do mês, saldo disponível, valor aguardando liberação, avaliação média, nº de clientes
- Gráfico simples de vendas dos últimos 30 dias (recharts já no projeto)

### 3. Páginas (criar/refazer com dados reais)

| Rota | Estado | Ação |
|---|---|---|
| `/seller` (dashboard) | novo | criar `seller.index.tsx` com KPIs |
| `/seller/products` | mover | extrair `ProductsTable` + modal do `seller.tsx` atual |
| `/seller/orders` | existe | revisar: tabela, filtros status, ações ver/imprimir/alterar status |
| `/seller/stock` | existe | revisar: SKU, qty, mín, alertas, ajuste em lote |
| `/seller/categories` | novo | listar categorias do vendedor |
| `/seller/coupons` | existe | revisar CRUD completo |
| `/seller/promotions` | existe | revisar preço orig → promo + % |
| `/seller/reviews` | existe | revisar + responder |
| `/seller/customers` | existe | lista agregada (nome, email, qtd compras, total gasto) |
| `/seller/messages` | novo | redirect/embed do `/messages` |
| `/seller/shipping` | existe | regras de frete por região |
| `/seller/shipments` | novo | envios pendentes com tracking |
| `/seller/finance` | existe | saldo, bloqueado, recebimentos, saques, extrato |
| `/seller/payouts` | novo | solicitar saque (via Stripe dashboard) |
| `/seller/profile` | existe | nome, logo, banner, contatos, redes, descrição |
| `/seller/settings` | existe | senha, notificações, dados bancários |
| `/seller/subscription` | existe | plano atual + alterar |
| `/seller/help` | existe | FAQ + abrir chamado |
| `/seller/reports` | existe | gráficos vendas/pedidos/receita c/ filtros |

## Detalhes técnicos
- Componente `AppSellerSidebar` em `src/components/seller/SellerSidebar.tsx` usando `useRouterState` para active
- `SidebarProvider` envolve o layout em `seller.tsx`; `SidebarTrigger` no header
- Server fns novos em `src/lib/seller-dashboard.functions.ts` (KPIs agregados), `src/lib/seller-customers.functions.ts`
- Reaproveitar `orders.functions.ts`, `finance.functions.ts`, `marketing.functions.ts`, `stock.functions.ts` já existentes
- Cada página: card branco com borda suave, header com título+descrição, ações no topo direito, tabela ou form com `react-hook-form` + zod
- Toasts via `sonner`, loading states via skeleton

## Entrega faseada (ordem)
**Fase A — Estrutura (esta entrega):**
1. Sidebar + layout `seller.tsx` refatorado
2. Dashboard `seller.index.tsx` com KPIs reais
3. Extrair `seller/products.tsx` do código atual
4. Polir páginas já existentes que estão "vazias" (stock, shipping, profile, subscription, help) com conteúdo funcional mínimo

**Fase B (próximas iterações):**
- Categorias, Mensagens, Envios, Payouts (páginas novas)
- Refinamento de Reports com filtros avançados
- Polimento visual final

## Riscos
- 13 páginas + dashboard em uma única entrega é arriscado; vou focar Fase A com qualidade e marcar Fase B como próximo passo.
- Algumas tabelas (ex: `customers`) precisam ser derivadas de `orders`+`profiles` — não há tabela dedicada.

Posso seguir com a **Fase A** agora?