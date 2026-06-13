import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — MercaBrasil" }] }),
  component: Auth,
});

function Auth() {
  const [mode, setMode] = useState<"login" | "register">("login");
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
          <form className="space-y-3">
            {mode === "register" && (
              <input placeholder="Nome completo" className="w-full h-11 px-3 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/40 outline-none text-sm" />
            )}
            <input placeholder="E-mail" type="email" className="w-full h-11 px-3 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/40 outline-none text-sm" />
            <input placeholder="Senha" type="password" className="w-full h-11 px-3 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/40 outline-none text-sm" />
            <button type="button" className="w-full h-11 rounded-lg bg-gradient-brand text-primary-foreground font-bold hover:opacity-95">
              {mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>
          <div className="text-center text-xs text-muted-foreground my-4">ou</div>
          <button className="w-full h-11 rounded-lg border border-border font-semibold text-sm hover:bg-secondary">Continuar com Google</button>
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
