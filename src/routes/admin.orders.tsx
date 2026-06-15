import { createFileRoute } from "@tanstack/react-router";
import { AdminModulePage } from "@/components/admin/AdminModulePage";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({ meta: [{ title: "Pedidos Admin — MercaBrasil" }] }),
  component: () => <AdminModulePage title="Pedidos" description="Acompanhamento administrativo de pedidos e entregas." />,
});