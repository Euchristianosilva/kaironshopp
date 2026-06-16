import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Painel de Suporte" }] }),
  component: SupportRedirect,
});

function SupportRedirect() {
  const navigate = useNavigate();
  const { user, loading, roleLoading, isSupport, isAdmin } = useAuth();
  useEffect(() => {
    if (loading || roleLoading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    if (isSupport || isAdmin) { navigate({ to: "/admin/support" }); return; }
    navigate({ to: "/" });
  }, [user, loading, roleLoading, isSupport, isAdmin, navigate]);
  return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Redirecionando…</div>;
}
