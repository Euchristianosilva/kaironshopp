import { createFileRoute } from "@tanstack/react-router";
import { AdminModulePage } from "@/components/admin/AdminModulePage";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({ meta: [{ title: "Categorias Admin — MercaBrasil" }] }),
  component: () => <AdminModulePage title="Categorias" description="Organização dos departamentos e vitrines da loja." />,
});