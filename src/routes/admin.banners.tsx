import { createFileRoute } from "@tanstack/react-router";
import { AdminModulePage } from "@/components/admin/AdminModulePage";

export const Route = createFileRoute("/admin/banners")({
  head: () => ({ meta: [{ title: "Banners Admin — MercaBrasil" }] }),
  component: () => <AdminModulePage title="Banners" description="Gestão dos banners e destaques da página inicial." />,
});