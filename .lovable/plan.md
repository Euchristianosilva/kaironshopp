# Painel do Vendedor Profissional — Plano em Fases

O escopo é muito grande (19 áreas, várias tabelas novas, Storage, gráficos, relatórios, cupons, variações, frete, etc.). Não dá para fazer tudo bem feito em um único turno — vou dividir em **6 fases** que entregam valor incremental, cada uma testável de ponta a ponta. Confirme a fase para eu começar (ou ajuste a ordem).

---

## Fase 1 — Cadastro de produtos profissional (base do resto)
**Foco:** acabar com URL de imagem e enriquecer o produto.

- Bucket `product-images` no Storage (público para leitura, RLS de escrita por dono)
- Componente `ProductImageUploader`: drag-and-drop, múltiplo (até 10), miniaturas, reordenar, escolher principal, remover, compressão client-side (`browser-image-compression`)
- Tabela nova `product_images` (product_id, url, position, is_primary)
- Novos campos em `products`: brand, model, sku, barcode, weight_g, height_cm, width_cm, length_cm, color, material, warranty, condition (`new|refurbished|used`), views, sales_count
- Categorias com subcategorias: tabela `categories` (parent_id self-ref) + seed; seletor em 2 níveis
- Modal de produto reformulado em abas: Básico · Mídias · Especificações · Estoque · Frete

## Fase 2 — Variações + Estoque + Frete
- Tabela `product_variants` (option1_name/value, option2_name/value, price, stock, sku)
- UI de matriz de variações (cor × tamanho etc.)
- Campos de frete no produto: origin_zip, own_delivery, free_shipping, carrier
- Estoque: min_stock, alerta visual, tabela `stock_movements` com histórico

## Fase 3 — Dashboard + tabela "Meus Produtos" profissional
- Dashboard com cards (ativos, pausados, vendidos, pedidos por status, faturamento mês/total, ticket médio, avaliação)
- Gráficos com `recharts`: vendas por mês, receita, top produtos, pedidos
- Tabela de produtos com colunas completas, ordenação, busca, paginação
- Ações: editar, duplicar, pausar/ativar, excluir, visualizar, skeleton loading

## Fase 4 — Pedidos + Clientes
- Página `/seller/orders` com filtros por status, detalhe do pedido (cliente, itens, endereço, pagamento, frete, rastreio)
- Ações: marcar como enviado, adicionar código de rastreio, imprimir etiqueta (PDF simples)
- Página `/seller/customers` agregando pedidos por buyer_id (qtd, total gasto, última compra)

## Fase 5 — Financeiro + Cupons + Promoções + Avaliações
- Financeiro: aproveita `seller.finance.tsx` existente e expande (extrato, comissões, taxas, solicitar saque via Stripe Connect)
- Tabela `coupons` (code, type percent/fixed, value, valid_from/to, max_uses, used_count, seller_id)
- Tabela `promotions` (product_id, promo_price, starts_at, ends_at) + contador regressivo na vitrine
- Tabela `reviews` (já pode existir) com resposta do vendedor e denúncia

## Fase 6 — Relatórios + Configurações da loja + Notificações
- Relatórios com exportação CSV/Excel (via `xlsx`) e PDF (`jspdf`)
- Configurações: logo/banner (Storage), redes sociais, políticas, horário (campos novos em `sellers`)
- Tabela `notifications` (user_id, type, payload, read_at) + sino no header com realtime

---

## Detalhes técnicos transversais

- **Storage:** buckets `product-images` e `store-assets`, ambos públicos para leitura; RLS de escrita exige `owner_id = auth.uid()` via path prefix `{seller_id}/...`
- **RLS:** todas as novas tabelas com policies `seller_id IN (select id from sellers where owner_id = auth.uid())`; grants para `authenticated` e `service_role`
- **Tipos:** após cada migration o `src/integrations/supabase/types.ts` é regenerado — só então mexo no código que consome o schema
- **Compatibilidade:** mantém o checkout/Stripe Connect já implementado; variações entram como linha extra em `order_items.variant_id`
- **Não-mock:** zero dados fake; tudo persistido

---

## Como prosseguir

Responda com **uma** das opções:

1. **"fase 1"** — começo agora pelo cadastro com upload de imagens (recomendado, destrava o resto)
2. **"tudo em ordem"** — executo fase 1 agora e sigo automaticamente para as próximas conforme você aprova
3. **Ordem customizada** — ex: "comece por pedidos e dashboard"
4. **Ajustes no plano** — diga o que mudar
