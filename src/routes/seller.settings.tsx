import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getStoreSettings, updateStoreSettings } from "@/lib/store-settings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Save } from "lucide-react";
import { SingleImageUpload } from "@/components/seller/SingleImageUpload";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/settings")({
  head: () => ({ meta: [{ title: "Configurações da loja — MercaBrasil" }] }),
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
    onSuccess: () => { toast.success("Configurações salvas"); qc.invalidateQueries({ queryKey: ["store-settings"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading || isLoading || !user || !form) return <Shell><p className="text-muted-foreground">Carregando...</p></Shell>;
  const set = (k: string) => (v: any) => setForm({ ...form, [k]: v });
  const onChange = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-3xl font-black flex items-center gap-2"><Settings className="h-7 w-7 text-primary" /> Configurações da loja</h1>
        <Link to="/seller" className="text-sm text-primary hover:underline">← Painel</Link>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="contact">Contato</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="policies">Políticas</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 bg-card border border-border rounded-xl p-5">
          <Field label="Nome da loja"><Input value={form.name ?? ""} onChange={onChange("name")} /></Field>
          <Field label="Descrição"><Textarea rows={3} value={form.description ?? ""} onChange={onChange("description")} /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
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
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <Switch checked={form.vacation_mode} onCheckedChange={set("vacation_mode")} />
            <div>
              <Label>Modo férias</Label>
              <p className="text-xs text-muted-foreground">Pausa temporária — produtos ficam ocultos da loja.</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4 bg-card border border-border rounded-xl p-5">
          <Field label="E-mail de contato"><Input type="email" value={form.email ?? ""} onChange={onChange("email")} /></Field>
          <Field label="Telefone"><Input value={form.phone ?? ""} onChange={onChange("phone")} placeholder="(11) 0000-0000" /></Field>
          <Field label="WhatsApp"><Input value={form.whatsapp ?? ""} onChange={onChange("whatsapp")} placeholder="+5511999999999" /></Field>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4 bg-card border border-border rounded-xl p-5">
          <Field label="Título SEO (máx. 60 caracteres)" hint={`${(form.seo_title ?? "").length}/60`}>
            <Input maxLength={60} value={form.seo_title ?? ""} onChange={onChange("seo_title")} placeholder="Sua loja oficial — Produtos de qualidade" />
          </Field>
          <Field label="Meta description (máx. 160)" hint={`${(form.seo_description ?? "").length}/160`}>
            <Textarea rows={3} maxLength={160} value={form.seo_description ?? ""} onChange={onChange("seo_description")} />
          </Field>
          <Field label="Palavras-chave (separadas por vírgula)">
            <Input value={form.seo_keywords ?? ""} onChange={onChange("seo_keywords")} placeholder="moda, calçados, brasil" />
          </Field>
          <div className="text-xs bg-secondary/40 rounded p-3 border border-border">
            <strong>Preview Google:</strong>
            <div className="text-blue-600 truncate mt-1">{form.seo_title || form.name}</div>
            <div className="text-green-700 text-xs">mercabrasil.com/loja/{form.slug}</div>
            <div className="text-muted-foreground text-xs line-clamp-2">{form.seo_description || form.description}</div>
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4 bg-card border border-border rounded-xl p-5">
          <Field label="Política de envio"><Textarea rows={4} value={form.shipping_policy ?? ""} onChange={onChange("shipping_policy")} /></Field>
          <Field label="Política de devolução"><Textarea rows={4} value={form.return_policy ?? ""} onChange={onChange("return_policy")} /></Field>
          <Field label="Termos e condições"><Textarea rows={5} value={form.terms ?? ""} onChange={onChange("terms")} /></Field>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => mut.mutate(form)} disabled={mut.isPending}>
          <Save className="h-4 w-4 mr-2" /> {mut.isPending ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>
    </Shell>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-0">
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">{children}</main>
      
    </div>
  );
}
