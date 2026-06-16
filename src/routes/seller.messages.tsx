import { createFileRoute, useSearch } from "@tanstack/react-router";
import { MessagesCenter } from "@/components/marketplace/MessagesCenter";

type Search = { c?: string };

export const Route = createFileRoute("/seller/messages")({
  head: () => ({ meta: [{ title: "Mensagens — Painel do Vendedor" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({ c: typeof s.c === "string" ? s.c : undefined }),
  component: SellerMessagesPage,
});

function SellerMessagesPage() {
  const { c: activeId } = useSearch({ from: "/seller/messages" }) as Search;
  return <MessagesCenter basePath="/seller/messages" activeId={activeId} />;
}
