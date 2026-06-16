import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { useAuth } from "@/hooks/use-auth";
import { myAgentInfo } from "@/lib/support.functions";
import { ShieldCheck } from "lucide-react";

export function SupportShell({
  title, description, actions, children, adminOnly = false,
}: {
  title?: string; description?: string; actions?: React.ReactNode; children: React.ReactNode; adminOnly?: boolean;
}) {
  const { user, loading, roleLoading, isAdmin } = useAuth();
  const info = useServerFn(myAgentInfo);
  const { data, isLoading } = useQuery({
    queryKey: ["my-agent-info", user?.id],
    queryFn: () => info(),
    enabled: !!user,
  });

  const isAgent = !!(data as any)?.agent?.active;
  const allowed = isAdmin || (!adminOnly && isAgent);

  if (loading || roleLoading || isLoading) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Verificando…</div>;
  }
  if (!allowed) {
    return (
      <div className="min-h-screen grid place-items-center px-4 text-center">
        <div>
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-destructive" />
          <h1 className="text-2xl font-black">Acesso negado.</h1>
          <Link to="/" className="mt-4 inline-block text-primary underline text-sm">Voltar</Link>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <AdminSidebar />
        <SidebarInset className="flex flex-col min-w-0">
          <AdminTopbar />
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
            {(title || actions) && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  {title && <h1 className="truncate text-xl sm:text-2xl font-black tracking-tight">{title}</h1>}
                  {description && <p className="text-sm text-muted-foreground mt-0.5 truncate">{description}</p>}
                </div>
                {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
              </div>
            )}
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
