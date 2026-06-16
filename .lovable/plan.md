## Sistema Completo de Suporte

Vou implementar um sistema profissional de tickets de suporte com chat em tempo real, equipe com permissões, e integração nos painéis admin e vendedor.

### 1. Banco de Dados (migration)

**Novo enum:**
- `support_role`: `agent`, `supervisor`, `manager`
- `ticket_status`: `open`, `in_progress`, `waiting_seller`, `resolved`, `closed`
- `ticket_category`: `financial`, `products`, `orders`, `shipping`, `technical`, `other`

**Novas tabelas:**
- `support_agents` (user_id, role, active, permissions jsonb)
- `support_tickets` (seller_id, opened_by, subject, category, status, assigned_to, last_message_at, seller_unread, agent_unread)
- `support_messages` (ticket_id, sender_id, sender_type [seller|agent], body, attachments jsonb)

**RLS:**
- Vendedores veem/criam tickets dos seus próprios sellers
- Agentes ativos veem todos os tickets; supervisor/manager podem reatribuir/encerrar
- Admin (`has_role admin`) tem acesso total
- Realtime habilitado em todas as três tabelas
- GRANTs apropriados

**Security definer functions:**
- `is_support_agent(uid)` → boolean
- `support_agent_role(uid)` → support_role

**Triggers:**
- Em INSERT messages: atualizar `last_message_at`, contadores de não lidas, criar notificação para o destinatário (reutiliza `notifications` existente, type `generic`)

### 2. Server Functions (`src/lib/support.functions.ts`)
- `listMyTickets` (vendedor)
- `createTicket` (vendedor)
- `listAllTickets` (suporte/admin) com filtros
- `getTicket` (ambos, conforme permissão)
- `sendTicketMessage`
- `updateTicketStatus` (suporte)
- `assignTicket` (supervisor+)
- `listAgents` / `createAgent` / `updateAgentPermissions` / `removeAgent` (admin)
- `markTicketRead`

`createAgent` usa `supabaseAdmin` (dynamic import) para criar usuário via Auth Admin API + insere em `support_agents` + `user_roles`.

### 3. Frontend

**Vendedor — `src/routes/seller.support.tsx`** (reescrever):
- Lista de chamados com status badges
- Botão "Novo Chamado" → dialog com assunto/categoria/mensagem
- Selecionar chamado → chat em tempo real (componente reutilizável `TicketChat`)
- Realtime via `supabase.channel` em `support_messages` filtrando por ticket_id

**Admin — novas rotas:**
- `src/routes/admin.support.tsx` — central de atendimento (lista + chat)
- `src/routes/admin.support-team.tsx` — gerenciamento de equipe (adicionar/editar/remover atendentes, definir permissões)

**Suporte (atendentes) — `src/routes/support.tsx`:**
- Layout simplificado para atendentes não-admin
- Mesma central de tickets, escopo conforme permissões

**Sidebar Admin (`AdminSidebar`):** adicionar "Suporte" e "Equipe de Suporte" (visível só para admin)
**Sidebar Vendedor:** já tem "Suporte" — atualizar com badge de não lidas

**Login redirect:** após login, se usuário for `support_agent` e não admin → `/support`; senão fluxo normal.

### 4. Realtime
- Habilitar `support_tickets` e `support_messages` no `supabase_realtime` publication
- Inscrição via `supabase.channel` em mount/unmount com `setQueryData` otimista

### 5. Componente compartilhado
`src/components/support/TicketChat.tsx` — usado por vendedor, admin e suporte. Recebe `ticketId` + `viewerType`.

### Arquivos a criar/editar
- `supabase/migrations/<ts>_support_system.sql` (novo)
- `src/lib/support.functions.ts` (novo)
- `src/components/support/TicketChat.tsx` (novo)
- `src/components/support/TicketList.tsx` (novo)
- `src/components/support/NewTicketDialog.tsx` (novo)
- `src/routes/seller.support.tsx` (reescrever)
- `src/routes/admin.support.tsx` (novo)
- `src/routes/admin.support-team.tsx` (novo)
- `src/routes/support.tsx` (novo, layout atendente)
- `src/components/admin/AdminSidebar.tsx` (editar — adicionar itens)
- `src/components/seller/SellerSidebar.tsx` (editar — badge suporte)
- `src/routes/auth.tsx` ou handler de login (editar — redirect agente)

### Observações
- Sem upload de anexos no primeiro release (campo `attachments jsonb` fica preparado; UI marca como "em breve") — para não estourar escopo. Confirme se devo incluir upload já agora.
- "Indicador de digitando" via Realtime broadcast (presence) — incluído.
