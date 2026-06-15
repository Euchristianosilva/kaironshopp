import { createFileRoute } from "@tanstack/react-router";
import { AdminModulePage } from "@/components/admin/AdminModulePage";

export const Route = createFileRoute("/admin/products")({
  head: () => ({ meta: [{ title: "Produtos Admin — MercaBrasil" }] }),
  component: () => <AdminModulePage title="Produtos" description="Auditoria, aprovação e moderação do catálogo." />,
});