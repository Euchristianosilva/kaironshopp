import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export function useAdminGuard() {
  const auth = useAuth();
  const navigate = useNavigate();
  const checking = auth.loading || auth.roleLoading;
  const isAdmin = !!auth.user && auth.role === "admin";

  useEffect(() => {
    if (checking) return;
    if (!auth.user) navigate({ to: "/" });
    if (auth.role !== "admin") navigate({ to: "/" });
  }, [checking, auth.user, auth.role, navigate]);

  return { ...auth, checking, isAdmin };
}