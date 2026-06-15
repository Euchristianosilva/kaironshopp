import { Link } from "@tanstack/react-router";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { ShieldCheck } from "lucide-react";

export function AdminModulePage({ title, description }: { title: string; description: string }) {
  const { checking, isAdmin } = useAdminGuard();

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 grid place-items-center text-muted-foreground">Verificando permissões...</main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 grid place-items-center px-4 text-center">
          <div>
            <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-destructive" />
            <h1 className="text-2xl font-black">Acesso negado.</h1>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Link to="/admin" className="text-sm text-primary hover:underline">← Painel Admin</Link>
        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <h1 className="text-3xl font-black">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}