import { createFileRoute } from "@tanstack/react-router";
import { AdminModulePage } from "@/components/admin/AdminModulePage";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Usuários Admin — MercaBrasil" }] }),
  component: () => <AdminModulePage title="Usuários" description="Consulta e gestão de clientes cadastrados." />,
});