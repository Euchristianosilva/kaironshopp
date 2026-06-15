import { createFileRoute } from "@tanstack/react-router";
import { AdminSellersPage } from "@/components/admin/AdminSellersPage";

export const Route = createFileRoute("/admin/vendors")({
  head: () => ({ meta: [{ title: "Vendedores — Admin" }] }),
  component: AdminSellersPage,
});