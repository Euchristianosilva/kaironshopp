import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

const OWNER_ADMIN_EMAIL = "kaironshopp@gmail.com";

export function useAdminGuard() {
  const auth = useAuth();
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (state) => state.location.pathname });
  const checking = auth.loading || auth.roleLoading;
  const email = auth.user?.email?.toLowerCase() ?? null;
  const isAdmin = !!auth.user && (auth.role === "admin" || email === OWNER_ADMIN_EMAIL);

  useEffect(() => {
    if (checking) return;
    const reason = !auth.user ? "not-authenticated" : !isAdmin ? "not-admin" : null;

    console.debug("[admin-guard]", {
      route: currentPath,
      userId: auth.user?.id ?? null,
      email,
      role: auth.role,
      isAdmin,
      reason,
    });

    if (!auth.user) {
      navigate({ to: "/auth", replace: true });
      return;
    }

    if (!isAdmin) {
      navigate({ to: "/", replace: true });
    }
  }, [checking, auth.user?.id, auth.user?.email, auth.role, email, isAdmin, currentPath, navigate]);

  return { ...auth, checking, isAdmin };
}