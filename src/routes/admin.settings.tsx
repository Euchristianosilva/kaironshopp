import { createFileRoute } from "@tanstack/react-router";
import { AdminModulePage } from "@/components/admin/AdminModulePage";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Configurações Admin — MercaBrasil" }] }),
  component: () => <AdminModulePage title="Configurações do sistema" description="Parâmetros gerais, identidade e regras da plataforma." />,
});