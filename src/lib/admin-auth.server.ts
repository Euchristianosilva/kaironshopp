import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const OWNER_ADMIN_EMAIL = "kaironshopp@gmail.com";

export type UserAccessRole = "admin" | "seller" | "customer";

export type UserAccess = {
  userId: string;
  email: string | null;
  role: UserAccessRole;
  roles: string[];
};

async function ensureRole(userId: string, role: UserAccessRole) {
  const { error } = await supabaseAdmin
    .from("user_roles")
    .insert({ user_id: userId, role })
    .select("id")
    .maybeSingle();

  if (error && error.code !== "23505") throw error;
}

export async function getUserAccess(userId: string, claimEmail?: string | null): Promise<UserAccess> {
  let email = claimEmail?.toLowerCase() ?? null;

  if (!email) {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    email = data.user?.email?.toLowerCase() ?? null;
  }

  const { data: roleRows, error: rolesError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (rolesError) throw rolesError;

  const roles = (roleRows ?? []).map((row) => row.role as string);

  if (email === OWNER_ADMIN_EMAIL) {
    if (!roles.includes("admin")) {
      await ensureRole(userId, "admin");
      roles.push("admin");
    }
    return { userId, email, role: "admin", roles };
  }

  const { data: seller } = await supabaseAdmin
    .from("sellers")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (roles.includes("seller") || seller) {
    if (!roles.includes("seller")) {
      await ensureRole(userId, "seller");
      roles.push("seller");
    }
    return { userId, email, role: "seller", roles };
  }

  if (!roles.includes("customer")) await ensureRole(userId, "customer");
  return { userId, email, role: "customer", roles: roles.includes("customer") ? roles : [...roles, "customer"] };
}

export async function assertAdminAccess(userId: string, claimEmail?: string | null) {
  const access = await getUserAccess(userId, claimEmail);
  if (access.role !== "admin") throw new Error("Acesso negado");
  return access;
}