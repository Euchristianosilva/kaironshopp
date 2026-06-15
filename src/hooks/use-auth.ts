import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserAccess } from "@/lib/auth.functions";

type AppRole = "admin" | "seller" | "customer";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const getAccess = useServerFn(getCurrentUserAccess);

  const { data: access, isLoading: roleLoading, refetch: refetchRole } = useQuery({
    queryKey: ["auth-access", user?.id],
    queryFn: () => getAccess(),
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
