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

      const [rolesRes, sellerRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("sellers").select("id").eq("owner_id", user.id).maybeSingle(),
      ]);

      if (rolesRes.error) throw rolesRes.error;
      const roles = (rolesRes.data ?? []).map((row) => row.role as string);
      const role: AppRole = email === OWNER_ADMIN_EMAIL || roles.includes("admin")
        ? "admin"
        : roles.includes("seller") || !!sellerRes.data
          ? "seller"
          : "customer";

      return { role, roles };
    },
    enabled: !!user && !loading,
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) setTimeout(() => refetchRole(), 0);
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
    role: (access?.role ?? null) as AppRole | null,
    roles: access?.roles ?? [],
    isAdmin: access?.role === "admin",
    isSeller: access?.role === "seller",
    isCustomer: access?.role === "customer",
    roleLoading: !!user && (loading || roleLoading),
    signOut: () => supabase.auth.signOut(),
  };
}
