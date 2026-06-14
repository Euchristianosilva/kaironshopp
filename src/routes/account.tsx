import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { listMyOrders, listMyReviews, listMyAddresses, upsertAddress, deleteAddress, updateProfile } from "@/lib/buyer.functions";
import { User, Package, Heart, MapPin, Star, LogOut, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Minha conta — MercaBrasil" }] }),
  component: Account,
});

const sections = [
  { id: "orders", label: "Meus pedidos", icon: Package },
  { id: "addresses", label: "Endereços", icon: MapPin },
  { id: "reviews", label: "Avaliações", icon: Star },
  { id: "favorites", label: "Favoritos", icon: Heart },
  { id: "profile", label: "Perfil", icon: User },
] as const;

type TabId = (typeof sections)[number]["id"];

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: "Aguardando pagamento", cls: "text-warning" },
  processing: { text: "Em preparação", cls: "text-warning" },
  shipped: { text: "Enviado", cls: "text-primary" },
  delivered: { text: "Entregue", cls: "text-success" },
  canceled: { text: "Cancelado", cls: "text-muted-foreground" },
  returned: { text: "Devolvido", cls: "text-muted-foreground" },
};

const fmt = (cents: number) => `R$ ${((cents ?? 0) / 100).toFixed(2).replace(".", ",")}`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString("pt-BR");

function Account() {
  const [tab, setTab] = useState<TabId>("orders");
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profileName, setProfileName] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate({ to: "/auth" }); return; }
      setUser({ id: data.user.id, email: data.user.email });
      supabase.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle().then(({ data: p }) => {
        if (p?.full_name) setProfileName(p.full_name);
      });
    });
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const initials = (profileName || user.email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          <aside className="bg-card border border-border rounded-xl p-4 h-fit lg:sticky lg:top-32">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="h-12 w-12 rounded-full bg-gradient-brand grid place-items-center text-primary-foreground font-black">{initials}</div>
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{profileName || "Comprador"}</div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
            </div>
            <nav className="mt-3 space-y-1">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setTab(s.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${tab === s.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                >
                  <s.icon className="h-4 w-4" /> {s.label}
                </button>
              ))}
              <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-secondary text-muted-foreground mt-2">
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </nav>
          </aside>

          <section className="bg-card border border-border rounded-xl p-6 min-h-[400px]">
            {tab === "orders" && <OrdersTab />}
            {tab === "addresses" && <AddressesTab />}
            {tab === "reviews" && <ReviewsTab />}
            {tab === "favorites" && <FavoritesTab />}
            {tab === "profile" && <ProfileTab initialName={profileName} email={user.email ?? ""} onUpdated={setProfileName} />}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function OrdersTab() {
  const fn = useServerFn(listMyOrders);
  const { data, isLoading, error } = useQuery({
    queryKey: ["buyer", "orders"],
    queryFn: () => fn({ data: {} as any }),
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorMsg msg={(error as Error).message} />;
  const orders = data?.orders ?? [];

  return (
    <>
      <h1 className="text-2xl font-black mb-4">Meus pedidos</h1>
      {orders.length === 0 ? (
        <EmptyState icon={Package} title="Você ainda não fez pedidos" cta={<Link to="/" className="text-primary font-semibold hover:underline">Explorar produtos</Link>} />
      ) : (
        <div className="space-y-3">
          {orders.map((o: any) => {
            const st = STATUS_LABEL[o.fulfillment_status] ?? STATUS_LABEL.pending;
            return (
              <div key={o.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                  <div>
                    <div className="font-bold text-sm">#{o.id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</div>
                  </div>
                  <div className={`text-sm font-semibold ${st.cls}`}>{st.text}</div>
                  <div className="font-black">{fmt(o.gross_cents)}</div>
                </div>
                {o.items?.length > 0 && (
                  <div className="text-xs text-muted-foreground border-t border-border pt-2 mt-2">
                    {o.items.map((it: any) => `${it.qty}× ${it.title}`).join(" · ")}
                  </div>
                )}
                {o.tracking_code && (
                  <div className="text-xs mt-2">Rastreio: <span className="font-mono">{o.tracking_code}</span>{o.carrier ? ` · ${o.carrier}` : ""}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function AddressesTab() {
  const fn = useServerFn(listMyAddresses);
  const del = useServerFn(deleteAddress);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["buyer", "addresses"], queryFn: () => fn({ data: {} as any }) });

  const mDel = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["buyer", "addresses"] }); toast.success("Endereço removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Loading />;
  const addresses = data?.addresses ?? [];

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black">Endereços</h1>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Novo</Button>
      </div>
      {addresses.length === 0 ? (
        <EmptyState icon={MapPin} title="Nenhum endereço cadastrado" />
      ) : (
        <div className="space-y-3">
          {addresses.map((a: any) => (
            <div key={a.id} className="border border-border rounded-lg p-4 flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-bold">{a.label || a.recipient}</div>
                  {a.is_default && <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">Padrão</span>}
                </div>
                <div className="text-sm text-muted-foreground">
                  {a.street}{a.number ? `, ${a.number}` : ""}{a.complement ? ` - ${a.complement}` : ""} · {a.district ? `${a.district}, ` : ""}{a.city}/{a.state} · CEP {a.zip}
                </div>
                {a.phone && <div className="text-xs text-muted-foreground mt-1">{a.phone}</div>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditing(a); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => mDel.mutate(a.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <AddressDialog open={open} onOpenChange={setOpen} initial={editing} />
    </>
  );
}

function AddressDialog({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (b: boolean) => void; initial: any | null }) {
  const save = useServerFn(upsertAddress);
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({});
  useEffect(() => { setForm(initial ?? { is_default: false }); }, [initial, open]);

  const m = useMutation({
    mutationFn: (payload: any) => save({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["buyer", "addresses"] });
      toast.success("Endereço salvo");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Editar endereço" : "Novo endereço"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Apelido (opcional)</Label><Input value={form.label ?? ""} onChange={(e) => set("label", e.target.value)} placeholder="Casa, Trabalho..." /></div>
          <div><Label>Destinatário *</Label><Input value={form.recipient ?? ""} onChange={(e) => set("recipient", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>CEP *</Label><Input value={form.zip ?? ""} onChange={(e) => set("zip", e.target.value)} /></div>
            <div><Label>Telefone</Label><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></div>
          </div>
          <div><Label>Rua *</Label><Input value={form.street ?? ""} onChange={(e) => set("street", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Número</Label><Input value={form.number ?? ""} onChange={(e) => set("number", e.target.value)} /></div>
            <div><Label>Complemento</Label><Input value={form.complement ?? ""} onChange={(e) => set("complement", e.target.value)} /></div>
          </div>
          <div><Label>Bairro</Label><Input value={form.district ?? ""} onChange={(e) => set("district", e.target.value)} /></div>
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <div><Label>Cidade *</Label><Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} /></div>
            <div><Label>UF *</Label><Input maxLength={2} value={form.state ?? ""} onChange={(e) => set("state", e.target.value.toUpperCase())} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.is_default} onChange={(e) => set("is_default", e.target.checked)} />
            Definir como endereço padrão
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => m.mutate(form)} disabled={m.isPending}>{m.isPending ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewsTab() {
  const fn = useServerFn(listMyReviews);
  const { data, isLoading } = useQuery({ queryKey: ["buyer", "reviews"], queryFn: () => fn({ data: {} as any }) });
  if (isLoading) return <Loading />;
  const reviews = data?.reviews ?? [];
  return (
    <>
      <h1 className="text-2xl font-black mb-4">Minhas avaliações</h1>
      {reviews.length === 0 ? (
        <EmptyState icon={Star} title="Você ainda não avaliou nenhum produto" />
      ) : (
        <div className="space-y-3">
          {reviews.map((r: any) => (
            <div key={r.id} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-sm">{r.products?.title ?? "Produto"}</div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
              </div>
              {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
              {r.seller_reply && (
                <div className="mt-3 pl-3 border-l-2 border-primary text-sm">
                  <div className="text-xs font-semibold text-primary mb-1">Resposta do vendedor</div>
                  {r.seller_reply}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-2">{fmtDate(r.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function FavoritesTab() {
  return (
    <>
      <h1 className="text-2xl font-black mb-4">Favoritos</h1>
      <EmptyState icon={Heart} title="Veja seus favoritos" cta={<Link to="/favorites" className="text-primary font-semibold hover:underline">Abrir lista completa</Link>} />
    </>
  );
}

function ProfileTab({ initialName, email, onUpdated }: { initialName: string; email: string; onUpdated: (name: string) => void }) {
  const [name, setName] = useState(initialName);
  useEffect(() => { setName(initialName); }, [initialName]);
  const fn = useServerFn(updateProfile);
  const m = useMutation({
    mutationFn: (full_name: string) => fn({ data: { full_name } }),
    onSuccess: (_d, name) => { toast.success("Perfil atualizado"); onUpdated(name); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <>
      <h1 className="text-2xl font-black mb-4">Perfil</h1>
      <div className="space-y-4 max-w-md">
        <div><Label>E-mail</Label><Input value={email} disabled /></div>
        <div><Label>Nome completo</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <Button onClick={() => m.mutate(name)} disabled={m.isPending || !name.trim()}>{m.isPending ? "Salvando..." : "Salvar alterações"}</Button>
      </div>
    </>
  );
}

function Loading() { return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>; }
function ErrorMsg({ msg }: { msg: string }) { return <div className="text-sm text-destructive py-4">{msg}</div>; }
function EmptyState({ icon: Icon, title, cta }: { icon: any; title: string; cta?: React.ReactNode }) {
  return (
    <div className="text-center py-16">
      <Icon className="h-12 w-12 mx-auto text-muted-foreground/40" />
      <h2 className="text-lg font-bold mt-3">{title}</h2>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
// Textarea is unused but kept available for future review-creation flow
void Textarea;
