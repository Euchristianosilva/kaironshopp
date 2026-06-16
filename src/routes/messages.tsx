import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { useAuth } from "@/hooks/use-auth";
import { MessagesCenter } from "@/components/marketplace/MessagesCenter";

type Search = { c?: string };

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Mensagens — Kairon Shop" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({ c: typeof s.c === "string" ? s.c : undefined }),
  component: MessagesPage,
});

function MessagesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { c: activeId } = useSearch({ from: "/messages" }) as Search;

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {loading || !user ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <MessagesCenter basePath="/messages" activeId={activeId} />
        )}
      </main>
      <Footer />
    </div>
  );
}
