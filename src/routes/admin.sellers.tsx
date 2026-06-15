import { createFileRoute } from "@tanstack/react-router";
import { AdminModulePage } from "@/components/admin/AdminModulePage";

export const Route = createFileRoute("/admin/sellers")({
  head: () => ({ meta: [{ title: "Vendedores Admin — MercaBrasil" }] }),
  component: () => <AdminModulePage title="Vendedores" description="Aprovação, auditoria e gestão de lojas vendedoras." />,
});