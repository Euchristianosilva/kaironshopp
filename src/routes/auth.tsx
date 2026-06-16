import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Kairon Shop" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { user, role, roleLoading, isSupport, isAdmin } = useAuth();

  useEffect(() => {
    if (!user || roleLoading) return;
    if (isSupport && !isAdmin) {
      navigate({ to: "/admin/support" });
      return;
    }
    navigate({ to: role === "admin" ? "/admin" : role === "seller" ? "/seller" : "/account" });
  }, [user, role, roleLoading, isSupport, isAdmin, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao autenticar");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) {
      toast.error(res.error.message);
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 grid place-items-center px-4 py-12">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-brand">
          <div className="flex gap-2 mb-6 bg-secondary rounded-lg p-1">
            <button onClick={() => setMode("login")} className={`flex-1 h-9 rounded-md font-semibold text-sm transition ${mode === "login" ? "bg-background shadow" : ""}`}>Entrar</button>
            <button onClick={() => setMode("register")} className={`flex-1 h-9 rounded-md font-semibold text-sm transition ${mode === "register" ? "bg-background shadow" : ""}`}>Criar conta</button>
          </div>
          <h1 className="text-2xl font-black">{mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            {mode === "login" ? "Acesse para comprar e acompanhar pedidos." : "É grátis e leva menos de 1 minuto."}
          </p>
          <form className="space-y-3" onSubmit={onSubmit}>
            {mode === "register" && (
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" className="w-full h-11 px-3 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/40 outline-none text-sm" />
            )}
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" type="email" required className="w-full h-11 px-3 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/40 outline-none text-sm" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" type="password" required minLength={6} className="w-full h-11 px-3 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/40 outline-none text-sm" />
            <button type="submit" disabled={busy} className="w-full h-11 rounded-lg bg-gradient-brand text-primary-foreground font-bold hover:opacity-95 disabled:opacity-60">
              {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>
          <div className="text-center text-xs text-muted-foreground my-4">ou</div>
          <button onClick={onGoogle} disabled={busy} className="w-full h-11 rounded-lg border border-border font-semibold text-sm hover:bg-secondary disabled:opacity-60">
            Continuar com Google
          </button>
          {mode === "login" && (
            <div className="text-center text-sm mt-4">
              <Link to="/" className="text-primary hover:underline">Esqueci minha senha</Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
