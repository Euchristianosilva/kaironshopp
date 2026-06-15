import { createFileRoute } from "@tanstack/react-router";
import { AdminModulePage } from "@/components/admin/AdminModulePage";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Relatórios Admin — MercaBrasil" }] }),
  component: () => <AdminModulePage title="Relatórios" description="Dados consolidados de operação, vendas e crescimento." />,
});