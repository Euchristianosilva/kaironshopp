import { createFileRoute } from "@tanstack/react-router";
import { AdminModulePage } from "@/components/admin/AdminModulePage";

export const Route = createFileRoute("/admin/coupons")({
  head: () => ({ meta: [{ title: "Cupons Admin — MercaBrasil" }] }),
  component: () => <AdminModulePage title="Cupons" description="Criação e controle de campanhas promocionais." />,
});