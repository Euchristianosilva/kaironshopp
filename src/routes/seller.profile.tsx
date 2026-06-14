import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getStoreSettings, updateStoreSettings } from "@/lib/store-settings.functions";
import { Store, ExternalLink } from "lucide-react";
import { SingleImageUpload } from "@/components/seller/SingleImageUpload";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/profile")({
  head: () => ({ meta: [{ title: "Perfil da loja — Painel do Vendedor" }] }),
  component: Page,
});

function Page() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  const qc = useQueryClient();
  const get = useServerFn(getStoreSettings);
  const upd = useServerFn(updateStoreSettings);
  const { data, isLoading } = useQuery({ queryKey: ["store-settings"], queryFn: () => get(), enabled: !!user });
  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (data) setForm(data); }, [data]);

  const mut = useMutation({
    mutationFn: (v: any) => upd({ data: v }),
    onSuccess: () => { toast.success("Perfil atualizado"); qc.invalidateQueries({ queryKey: ["store-settings"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading || isLoading || !user || !form) return (
    <div className="min-h-0">
      <main className="flex-1 grid place-items-center text-muted-foreground">Carregando...</main>
    </div>
  );

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-0">
      
      <main className="flex-1 container mx-auto px-4 py-8 space-y-6 max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-black flex items-center gap-2"><Store className="h-7 w-7 text-primary" /> Perfil da loja</h1>
          <Link to="/seller" className="text-sm text-primary hover:underline">← Painel</Link>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-4">
            {form.logo_url ? <img src={form.logo_url} alt="" className="h-16 w-16 rounded-full object-cover border border-border" /> : <div className="h-16 w-16 rounded-full bg-muted grid place-items-center text-2xl font-bold text-muted-foreground">{form.name?.[0] ?? "?"}</div>}
            <div>
              <div className="font-bold">{form.name}</div>
              <div className="text-xs text-muted-foreground">/{form.slug}</div>
              <Link to="/category/$slug" params={{ slug: form.slug }} className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1">
                Ver loja pública <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold">Nome da loja</label>
              <input value={form.name ?? ""} onChange={set("name")} className="w-full h-10 px-3 mt-1 rounded-md border border-border bg-background text-sm" />
            </div>
            <div />
            <SingleImageUpload
              sellerId={form.id}
              folder="branding/logo"
              label="Logo da loja"
              aspect="square"
              value={form.logo_url}
              onChange={(url) => setForm({ ...form, logo_url: url })}
            />
            <SingleImageUpload
              sellerId={form.id}
              folder="branding/banner"
              label="Banner da loja"
              aspect="banner"
              value={form.banner_url}
              onChange={(url) => setForm({ ...form, banner_url: url })}
            />
            <div>
              <label className="text-sm font-semibold">E-mail de contato</label>
              <input type="email" value={form.email ?? ""} onChange={set("email")} className="w-full h-10 px-3 mt-1 rounded-md border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold">Telefone</label>
              <input value={form.phone ?? ""} onChange={set("phone")} className="w-full h-10 px-3 mt-1 rounded-md border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold">WhatsApp</label>
              <input value={form.whatsapp ?? ""} onChange={set("whatsapp")} className="w-full h-10 px-3 mt-1 rounded-md border border-border bg-background text-sm" />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold">Descrição</label>
            <textarea value={form.description ?? ""} onChange={set("description")} rows={4} className="w-full px-3 py-2 mt-1 rounded-md border border-border bg-background text-sm" />
          </div>

          <button onClick={() => mut.mutate({
            name: form.name, logo_url: form.logo_url, banner_url: form.banner_url,
            email: form.email, phone: form.phone, whatsapp: form.whatsapp, description: form.description,
          })} disabled={mut.isPending}
            className="h-11 px-5 rounded-lg bg-gradient-brand text-primary-foreground font-semibold disabled:opacity-60">
            {mut.isPending ? "Salvando..." : "Salvar perfil"}
          </button>
        </div>
      </main>
      
    </div>
  );
}
