import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "seller" | "customer";
const OWNER_ADMIN_EMAIL = "kaironshopp@gmail.com";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: access, isLoading: roleLoading, refetch: refetchRole } = useQuery({
    queryKey: ["auth-access", user?.id],
    queryFn: async () => {
      if (!user) return { role: null as AppRole | null, roles: [] as string[] };
      const email = user.email?.toLowerCase() ?? null;
      if (email === OWNER_ADMIN_EMAIL) {
        console.debug("[auth-access]", { email, role: "admin", source: "owner-email" });
        return { role: "admin" as AppRole, roles: ["admin"] };
      }

      const [rolesRes, sellerRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("sellers").select("id").eq("owner_id", user.id).maybeSingle(),
      ]);

      if (rolesRes.error) console.warn("[auth-access] user_roles read failed", rolesRes.error.message);
      const roles = (rolesRes.data ?? []).map((row) => row.role as string);
      const role: AppRole = email === OWNER_ADMIN_EMAIL || roles.includes("admin")
        ? "admin"
        : roles.includes("seller") || !!sellerRes.data
          ? "seller"
          : "customer";

      console.debug("[auth-access]", { email, role, roles, seller: !!sellerRes.data });
      return { role, roles };
    },
    enabled: !!user && !loading,
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
        setTimeout(() => refetchRole(), 0);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return {
    session,
    user,
    loading,
    role: (user ? access?.role ?? null : null) as AppRole | null,
    roles: user ? access?.roles ?? [] : [],
    isAdmin: !!user && access?.role === "admin",
    isSeller: !!user && access?.role === "seller",
    isCustomer: !!user && access?.role === "customer",
    roleLoading: !!user && (loading || roleLoading),
    signOut: () => supabase.auth.signOut(),
  };
}
