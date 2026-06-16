import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Category = "financial" | "products" | "orders" | "shipping" | "technical" | "other";
type Status = "open" | "in_progress" | "waiting_seller" | "resolved" | "closed";
type Department = "financial" | "commercial" | "logistics" | "technical" | "general";
type AgentRole = "agent" | "supervisor" | "manager";

const DEPARTMENTS: Department[] = ["financial", "commercial", "logistics", "technical", "general"];
const AGENT_ROLES: AgentRole[] = ["agent", "supervisor", "manager"];
const DEPT_LABEL_PT: Record<Department, string> = {
  financial: "Financeiro",
  commercial: "Comercial",
  logistics: "Logística",
  technical: "Técnico",
  general: "Atendimento Geral",
};

function categoryToDepartment(c: Category): Department {
  if (c === "financial") return "financial";
  if (c === "shipping") return "logistics";
  if (c === "technical") return "technical";
  if (c === "products" || c === "orders") return "commercial";
  return "general";
}

async function isSupportOrAdmin(supabase: any, userId: string) {
  const [{ data: agent }, { data: roles }] = await Promise.all([
    supabase.from("support_agents").select("id, role, active, department, permissions").eq("user_id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
  const isAgent = !!agent && agent.active !== false;
  return { isAdmin, isAgent, agent };
}

export const listMyTickets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: seller } = await supabase.from("sellers").select("id").eq("owner_id", userId).maybeSingle();
    const { data, error } = await supabase
      .from("support_tickets")
      .select("id, subject, category, status, last_message_at, last_message_preview, seller_unread, agent_unread, created_at")
      .eq("opened_by", userId)
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { tickets: data ?? [], sellerId: seller?.id ?? null };
  });

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { subject: string; category: Category; body: string }) => {
    const subject = (i.subject ?? "").trim();
    const body = (i.body ?? "").trim();
    if (subject.length < 3 || subject.length > 160) throw new Error("Assunto inválido");
    if (body.length < 1 || body.length > 4000) throw new Error("Mensagem inválida");
    const cats: Category[] = ["financial", "products", "orders", "shipping", "technical", "other"];
    if (!cats.includes(i.category)) throw new Error("Categoria inválida");
    return { subject, body, category: i.category };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: seller } = await supabase.from("sellers").select("id").eq("owner_id", userId).maybeSingle();
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        opened_by: userId,
        seller_id: seller?.id ?? null,
        subject: data.subject,
        category: data.category,
        department: categoryToDepartment(data.category),
        last_message_preview: data.body.slice(0, 140),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: mErr } = await supabase
      .from("support_messages")
      .insert({ ticket_id: ticket.id, sender_id: userId, sender_type: "seller", body: data.body });
    if (mErr) throw new Error(mErr.message);
    return { id: ticket.id };
  });

export const listAllTickets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { status?: Status | "all"; department?: Department | "all" }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { isAdmin, isAgent, agent } = await isSupportOrAdmin(supabase, userId);
    if (!isAdmin && !isAgent) throw new Error("Sem permissão");

    let q = supabase
      .from("support_tickets")
      .select("id, subject, category, status, department, seller_id, opened_by, assigned_to, last_message_at, last_message_preview, agent_unread, created_at, sellers(name, logo_url)")
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);

    // Department scope: managers/admins see all; supervisors/agents pinned to their dept
    if (!isAdmin && agent && agent.role !== "manager") {
      q = q.eq("department", agent.department);
    } else if (data.department && data.department !== "all") {
      q = q.eq("department", data.department);
    }

    const { data: tickets, error } = await q;
    if (error) throw new Error(error.message);

    const userIds = Array.from(new Set((tickets ?? []).map((t: any) => t.opened_by)));
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
    const pmap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return {
      tickets: (tickets ?? []).map((t: any) => ({ ...t, opener: pmap.get(t.opened_by) ?? null })),
      viewerAgent: agent ?? null,
      isAdmin,
    };
  });

export const getTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { ticket_id: string }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { isAdmin, isAgent } = await isSupportOrAdmin(supabase, userId);

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .select("id, subject, category, status, department, seller_id, opened_by, assigned_to, created_at, sellers(id, name, logo_url)")
      .eq("id", data.ticket_id)
      .maybeSingle();
    if (error || !ticket) throw new Error("Chamado não encontrado");

    const isOwner = ticket.opened_by === userId;
    if (!isOwner && !isAdmin && !isAgent) throw new Error("Sem acesso");

    const { data: messages, error: mErr } = await supabase
      .from("support_messages")
      .select("id, ticket_id, sender_id, sender_type, body, attachments, read_at, created_at")
      .eq("ticket_id", data.ticket_id)
      .order("created_at", { ascending: true })
      .limit(1000);
    if (mErr) throw new Error(mErr.message);

    // mark read + reset unread counters
    const isViewerSeller = isOwner;
    await supabase
      .from("support_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("ticket_id", data.ticket_id)
      .neq("sender_id", userId)
      .is("read_at", null);
    await supabase
      .from("support_tickets")
      .update(isViewerSeller ? { seller_unread: 0 } : { agent_unread: 0 })
      .eq("id", data.ticket_id);

    const senderIds = Array.from(new Set([ticket.opened_by, ...(messages ?? []).map((m: any) => m.sender_id)]));
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", senderIds);
    const pmap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    return {
      ticket: { ...ticket, opener: pmap.get(ticket.opened_by) ?? null },
      messages: (messages ?? []).map((m: any) => ({ ...m, sender: pmap.get(m.sender_id) ?? null })),
      viewerRole: isViewerSeller ? "seller" : "agent",
      me: userId,
    };
  });

export const sendTicketMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { ticket_id: string; body: string }) => {
    const body = (i.body ?? "").trim();
    if (!body || body.length > 4000) throw new Error("Mensagem inválida");
    return { ticket_id: i.ticket_id, body };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("id, opened_by")
      .eq("id", data.ticket_id)
      .maybeSingle();
    if (!ticket) throw new Error("Chamado não encontrado");
    const { isAdmin, isAgent } = await isSupportOrAdmin(supabase, userId);
    const isOwner = ticket.opened_by === userId;
    if (!isOwner && !isAdmin && !isAgent) throw new Error("Sem acesso");

    const sender_type = isOwner ? "seller" : "agent";
    const { data: msg, error } = await supabase
      .from("support_messages")
      .insert({ ticket_id: data.ticket_id, sender_id: userId, sender_type, body: data.body })
      .select("id, ticket_id, sender_id, sender_type, body, attachments, read_at, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, message: msg };
  });

export const updateTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { ticket_id: string; status: Status }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { isAdmin, isAgent } = await isSupportOrAdmin(supabase, userId);
    if (!isAdmin && !isAgent) throw new Error("Sem permissão");
    const { error } = await supabase
      .from("support_tickets")
      .update({ status: data.status, assigned_to: userId })
      .eq("id", data.ticket_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const transferTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { ticket_id: string; department: Department }) => {
    if (!DEPARTMENTS.includes(i.department)) throw new Error("Departamento inválido");
    if (!i.ticket_id) throw new Error("Chamado inválido");
    return i;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { isAdmin, isAgent } = await isSupportOrAdmin(supabase, userId);
    if (!isAdmin && !isAgent) throw new Error("Sem permissão");

    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("id, department")
      .eq("id", data.ticket_id)
      .maybeSingle();
    if (!ticket) throw new Error("Chamado não encontrado");
    if (ticket.department === data.department) return { ok: true, message: null };

    const { error: uErr } = await supabase
      .from("support_tickets")
      .update({ department: data.department, assigned_to: null })
      .eq("id", data.ticket_id);
    if (uErr) throw new Error(uErr.message);

    const note = `Atendimento encaminhado para o setor ${DEPT_LABEL_PT[data.department]}.`;
    const { data: msg, error: mErr } = await supabase
      .from("support_messages")
      .insert({ ticket_id: data.ticket_id, sender_id: userId, sender_type: "system", body: note })
      .select("id, ticket_id, sender_id, sender_type, body, attachments, read_at, created_at")
      .single();
    if (mErr) throw new Error(mErr.message);

    return { ok: true, message: msg };
  });

export const listAgents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { isAdmin } = await isSupportOrAdmin(supabase, userId);
    if (!isAdmin) throw new Error("Apenas administrador");
    const { data, error } = await supabase
      .from("support_agents")
      .select("id, user_id, role, department, active, permissions, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((a: any) => a.user_id);
    const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
    const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return { agents: (data ?? []).map((a: any) => ({ ...a, profile: pmap.get(a.user_id) ?? null })) };
  });

export const createAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { email: string; password: string; full_name: string; role: AgentRole; department: Department }) => {
    const email = (i.email ?? "").trim().toLowerCase();
    const password = i.password ?? "";
    const full_name = (i.full_name ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido");
    if (password.length < 8) throw new Error("Senha precisa ter ao menos 8 caracteres");
    if (full_name.length < 2) throw new Error("Nome inválido");
    if (!AGENT_ROLES.includes(i.role)) throw new Error("Cargo inválido");
    if (!DEPARTMENTS.includes(i.department)) throw new Error("Departamento inválido");
    return { email, password, full_name, role: i.role, department: i.department };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { isAdmin } = await isSupportOrAdmin(supabase, userId);
    if (!isAdmin) {
      throw new Error("Apenas administrador pode adicionar atendentes");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    let uid = created?.user?.id ?? null;
    const createdNewUser = !!uid;
    if (!uid) {
      // Fallback: page through existing users to find by email
      let page = 1;
      while (!uid && page <= 10) {
        const { data: list, error: lErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (lErr) break;
        const found = list?.users?.find((u: any) => (u.email ?? "").toLowerCase() === data.email);
        if (found) { uid = found.id; break; }
        if (!list?.users?.length || list.users.length < 1000) break;
        page++;
      }
    }
    if (!uid) {
      const msg = cErr?.message || "Não foi possível criar o usuário (verifique e-mail e senha)";
      throw new Error(msg);
    }

    try {
      if (!createdNewUser) {
        const { error: updateUserErr } = await supabaseAdmin.auth.admin.updateUserById(uid, {
          password: data.password,
          email_confirm: true,
          user_metadata: { full_name: data.full_name },
        });
        if (updateUserErr) throw new Error("Falha ao atualizar credenciais do usuário: " + updateUserErr.message);
      }

      const { error: pErr } = await supabaseAdmin
        .from("profiles")
        .upsert({ id: uid, full_name: data.full_name }, { onConflict: "id" });
      if (pErr) throw new Error("Falha ao salvar perfil: " + pErr.message);

      const { error: aErr } = await supabaseAdmin
        .from("support_agents")
        .upsert(
          { user_id: uid, role: data.role, department: data.department, active: true },
          { onConflict: "user_id" },
        );
      if (aErr) throw new Error("Falha ao salvar atendente: " + aErr.message);
    } catch (error) {
      if (createdNewUser) await supabaseAdmin.auth.admin.deleteUser(uid).catch(() => null);
      throw error;
    }

    return { ok: true, user_id: uid };
  });

export const updateAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { agent_id: string; role?: AgentRole; department?: Department; active?: boolean; permissions?: Record<string, boolean> }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { isAdmin } = await isSupportOrAdmin(supabase, userId);
    if (!isAdmin) throw new Error("Apenas administrador");
    const patch: any = {};
    if (data.role && AGENT_ROLES.includes(data.role)) patch.role = data.role;
    if (data.department && DEPARTMENTS.includes(data.department)) patch.department = data.department;
    if (typeof data.active === "boolean") patch.active = data.active;
    if (data.permissions) patch.permissions = data.permissions;
    const { error } = await supabase.from("support_agents").update(patch).eq("id", data.agent_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { agent_id: string }) => i)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { isAdmin } = await isSupportOrAdmin(supabase, userId);
    if (!isAdmin) throw new Error("Apenas administrador");
    const { error } = await supabase.from("support_agents").delete().eq("id", data.agent_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const myAgentInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("support_agents")
      .select("id, role, department, active, permissions")
      .eq("user_id", userId)
      .maybeSingle();
    return { agent: data ?? null };
  });
