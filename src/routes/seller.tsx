import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { categories, formatBRL } from "@/lib/mock-data";
import { Plus, Package, Pencil, Trash2, Store, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/seller")({
  head: () => ({ meta: [{ title: "Painel do Vendedor — MercaBrasil" }] }),
  component: SellerPage,
});

type Seller = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
};

type ProductRow = {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  category_slug: string;
  image_url: string | null;
  stock: number | null;
  is_active: boolean | null;
  free_shipping: boolean | null;
  description: string | null;
};

function SellerPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 grid place-items-center text-muted-foreground">Carregando...</main>
        <Footer />
      </div>
    );
  }

  return <SellerDashboard userId={user.id} />;
}

function SellerDashboard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ProductRow | "new" | null>(null);

  const { data: seller, isLoading: sellerLoading } = useQuery<Seller | null>({
    queryKey: ["seller", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("owner_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as Seller | null;
    },
  });

  const { data: products = [], isLoading: prodLoading } = useQuery<ProductRow[]>({
    queryKey: ["seller-products", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", seller!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto removido");
      qc.invalidateQueries({ queryKey: ["seller-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (sellerLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 grid place-items-center text-muted-foreground">Carregando...</main>
        <Footer />
      </div>
    );
  }

  if (!seller) return <CreateSellerForm userId={userId} />;

  const revenue = products.reduce((a, p) => a + Number(p.price), 0);
  const active = products.filter((p) => p.is_active).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-black">Painel do Vendedor</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Store className="h-4 w-4" /> {seller.name}
            </p>
          </div>
          <button onClick={() => setEditing("new")} className="h-11 px-5 rounded-lg bg-gradient-brand text-primary-foreground font-semibold flex items-center gap-2 hover:opacity-95">
            <Plus className="h-4 w-4" /> Novo produto
          </button>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard label="Catálogo" value={String(products.length)} />
          <StatCard label="Ativos" value={String(active)} />
          <StatCard label="Valor de catálogo" value={formatBRL(revenue)} />
        </div>

        <div className="bg-card border border-border rounded-xl mt-6 overflow-hidden">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-lg">Meus produtos</h2>
          </div>
          {prodLoading ? (
            <div className="p-10 text-center text-muted-foreground">Carregando...</div>
          ) : products.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              Nenhum produto ainda. Clique em "Novo produto" para começar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40">
                  <tr className="text-left">
                    <th className="py-3 px-4 font-semibold">Produto</th>
                    <th className="py-3 px-4 font-semibold">Categoria</th>
                    <th className="py-3 px-4 font-semibold">Preço</th>
                    <th className="py-3 px-4 font-semibold">Estoque</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="py-3 px-4 flex items-center gap-3">
                        <div className="h-10 w-10 bg-secondary/40 rounded overflow-hidden shrink-0">
                          {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <span className="font-medium line-clamp-1 max-w-[280px]">{p.title}</span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{p.category_slug}</td>
                      <td className="py-3 px-4 font-bold">{formatBRL(Number(p.price))}</td>
                      <td className="py-3 px-4">{p.stock ?? 0}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${p.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                          {p.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex gap-1">
                          <button onClick={() => setEditing(p)} className="p-2 rounded hover:bg-secondary" title="Editar"><Pencil className="h-4 w-4" /></button>
                          <button
                            onClick={() => { if (confirm(`Excluir "${p.title}"?`)) deleteMut.mutate(p.id); }}
                            className="p-2 rounded hover:bg-destructive/10 text-destructive"
                            title="Excluir"
                          ><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-primary hover:underline">← Voltar para a loja</Link>
        </div>
      </main>
      <Footer />

      {editing && (
        <ProductFormModal
          sellerId={seller.id}
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-black mt-1">{value}</div>
    </div>
  );
}

function CreateSellerForm({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMut = useMutation({
    mutationFn: async () => {
      const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const finalSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase
        .from("sellers")
        .insert({ owner_id: userId, name, description, slug: finalSlug })
        .select()
        .single();
      if (error) throw error;
      // ensure seller role
      await supabase.from("user_roles").insert({ user_id: userId, role: "seller" }).select();
      return data;
    },
    onSuccess: () => {
      toast.success("Loja criada!");
      qc.invalidateQueries({ queryKey: ["seller", userId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 grid place-items-center px-4 py-12">
        <form
          onSubmit={(e) => { e.preventDefault(); if (name) createMut.mutate(); }}
          className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-brand"
        >
          <Store className="h-12 w-12 text-primary mb-3" />
          <h1 className="text-2xl font-black">Crie sua loja</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Para começar a vender, dê um nome à sua loja.
          </p>
          <div className="space-y-3">
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da loja" className="w-full h-11 px-3 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/40 outline-none text-sm" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição (opcional)" rows={3} className="w-full px-3 py-2 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/40 outline-none text-sm" />
            <button disabled={createMut.isPending} className="w-full h-11 rounded-lg bg-gradient-brand text-primary-foreground font-bold hover:opacity-95 disabled:opacity-60">
              {createMut.isPending ? "Criando..." : "Criar loja"}
            </button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}

function ProductFormModal({ sellerId, product, onClose }: { sellerId: string; product: ProductRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: product?.title ?? "",
    description: product?.description ?? "",
    price: product?.price ? String(product.price) : "",
    original_price: product?.original_price ? String(product.original_price) : "",
    category_slug: product?.category_slug ?? categories[0].slug,
    image_url: product?.image_url ?? "",
    stock: product?.stock ?? 10,
    free_shipping: product?.free_shipping ?? false,
    is_active: product?.is_active ?? true,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        seller_id: sellerId,
        title: form.title,
        description: form.description || null,
        price: Number(form.price),
        original_price: form.original_price ? Number(form.original_price) : null,
        category_slug: form.category_slug,
        image_url: form.image_url || null,
        stock: Number(form.stock),
        free_shipping: form.free_shipping,
        is_active: form.is_active,
      };
      if (product) {
        const { error } = await supabase.from("products").update(payload).eq("id", product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(product ? "Produto atualizado" : "Produto criado");
      qc.invalidateQueries({ queryKey: ["seller-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); saveMut.mutate(); }}
        className="bg-card border border-border rounded-2xl w-full max-w-2xl p-6 shadow-brand my-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black">{product ? "Editar produto" : "Novo produto"}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Título" className="sm:col-span-2">
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
          </Field>
          <Field label="Categoria">
            <select value={form.category_slug} onChange={(e) => setForm({ ...form, category_slug: e.target.value })} className="input">
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="URL da imagem">
            <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="input" />
          </Field>
          <Field label="Preço (R$)">
            <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" />
          </Field>
          <Field label="Preço original (riscado)">
            <input type="number" min="0" step="0.01" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} className="input" />
          </Field>
          <Field label="Estoque">
            <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className="input" />
          </Field>
          <Field label="Descrição" className="sm:col-span-2">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="input" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.free_shipping} onChange={(e) => setForm({ ...form, free_shipping: e.target.checked })} />
            Frete grátis
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Ativo (visível na loja)
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-border font-semibold hover:bg-secondary">Cancelar</button>
          <button disabled={saveMut.isPending} className="h-10 px-6 rounded-lg bg-gradient-brand text-primary-foreground font-bold hover:opacity-95 disabled:opacity-60">
            {saveMut.isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>

        <style>{`.input{height:2.5rem;width:100%;padding:0 0.75rem;border-radius:0.375rem;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:0.875rem;outline:none;}.input:focus{box-shadow:0 0 0 2px hsl(var(--primary)/0.4);}textarea.input{height:auto;padding:0.5rem 0.75rem;}`}</style>
      </form>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
