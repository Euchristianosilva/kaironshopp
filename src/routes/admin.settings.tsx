import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { getPlatformSettings, updatePlatformSettings } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Configurações — Admin" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(getPlatformSettings);
  const save = useServerFn(updatePlatformSettings);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-settings"], queryFn: () => fn() });

  const [form, setForm] = useState({ commission_percent: 10, platform_name: "MercaBrasil", logo_url: "", support_email: "", seo_title: "", seo_description: "" });
  useEffect(() => {
    if (data) setForm({
      commission_percent: Number((data as any).commission_percent ?? 10),
      platform_name: (data as any).platform_name ?? "MercaBrasil",
      logo_url: (data as any).logo_url ?? "",
      support_email: (data as any).support_email ?? "",
      seo_title: (data as any).seo_title ?? "",
      seo_description: (data as any).seo_description ?? "",
    });
  }, [data]);

  const submit = async () => {
    try {
      await save({ data: {
        commission_percent: Number(form.commission_percent),
        platform_name: form.platform_name,
        logo_url: form.logo_url || null,
        support_email: form.support_email || null,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
      } });
      toast.success("Configurações salvas"); qc.invalidateQueries({ queryKey: ["admin-settings"] });
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  if (isLoading) return <AdminShell title="Configurações"><div className="text-muted-foreground text-sm">Carregando…</div></AdminShell>;

  return (
    <AdminShell title="Configurações do sistema" description="Identidade, SEO e taxas da plataforma.">
      <div className="max-w-2xl bg-card border border-border rounded-xl p-5 space-y-3">
        <Field label="Nome da plataforma"><input value={form.platform_name} onChange={(e) => setForm({ ...form, platform_name: e.target.value })} className="i" /></Field>
        <Field label="URL do logo"><input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." className="i" /></Field>
        <Field label="E-mail de suporte"><input type="email" value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} className="i" /></Field>
        <Field label="Comissão da plataforma (%)"><input type="number" step="0.1" min={0} max={100} value={form.commission_percent} onChange={(e) => setForm({ ...form, commission_percent: Number(e.target.value) })} className="i" /></Field>
        <Field label="SEO — Título"><input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} className="i" /></Field>
        <Field label="SEO — Descrição"><textarea value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} rows={3} className="i resize-y" /></Field>
        <button onClick={submit} className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Salvar configurações</button>
      </div>
      <style>{`.i{height:40px;width:100%;padding:0 12px;border-radius:6px;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:14px} textarea.i{height:auto;padding:8px 12px}`}</style>
    </AdminShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
