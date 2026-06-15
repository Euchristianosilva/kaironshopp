import { createFileRoute } from "@tanstack/react-router";
import { AdminModulePage } from "@/components/admin/AdminModulePage";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Admin — MercaBrasil" }] }),
  component: () => <AdminModulePage title="Dashboard" description="Indicadores e visão operacional da plataforma." />,
});