import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

import { Plus, Store, X, CreditCard, CheckCircle2, AlertTriangle, Wallet, Package, Users, TicketPercent, Sparkles, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { createConnectAccount, refreshConnectStatus, createExpressDashboardLink } from "@/lib/connect.functions";
import { ProductImageUploader } from "@/components/seller/ProductImageUploader";
import { CategorySelect } from "@/components/seller/CategorySelect";
import { VariantsEditor, type VariantDraft } from "@/components/seller/VariantsEditor";
import { SellerStats } from "@/components/seller/SellerStats";
import { ProductsTable } from "@/components/seller/ProductsTable";

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
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean | null;
  stripe_payouts_enabled: boolean | null;
  stripe_onboarding_status: "pending" | "restricted" | "active" | null;
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

  const toggleActiveMut = useMutation({
    mutationFn: async (p: ProductRow) => {
      const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["seller-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const duplicateMut = useMutation({
    mutationFn: async (p: ProductRow) => {
      const { data: full, error: e1 } = await supabase.from("products").select("*").eq("id", p.id).single();
      if (e1) throw e1;
      const { id, created_at, updated_at, views, sales_count, ...rest } = full as any;
      const { error } = await supabase.from("products").insert({ ...rest, title: `${rest.title} (cópia)`, is_active: false });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto duplicado");
      qc.invalidateQueries({ queryKey: ["seller-products"] });
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

        <ConnectCard seller={seller} />

        <SellerStats sellerId={seller.id} products={products} />

        <ProductsTable
          products={products as any}
          loading={prodLoading}
          onEdit={(p) => setEditing(p as any)}
          onDelete={(p) => deleteMut.mutate(p.id)}
          onToggleActive={(p) => toggleActiveMut.mutate(p as any)}
          onDuplicate={(p) => duplicateMut.mutate(p as any)}
        />


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

function ConnectCard({ seller }: { seller: Seller }) {
  const qc = useQueryClient();
  const createAcct = useServerFn(createConnectAccount);
  const refresh = useServerFn(refreshConnectStatus);
  const dashboard = useServerFn(createExpressDashboardLink);
  const [loading, setLoading] = useState<string | null>(null);

  const status = seller.stripe_onboarding_status ?? "pending";
  const isActive = status === "active" && seller.stripe_charges_enabled;
  const hasAccount = !!seller.stripe_account_id;

  const startOnboarding = async () => {
    try {
      setLoading("onboard");
      const { url } = await createAcct({ data: { origin: window.location.origin } });
      window.location.href = url!;
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao iniciar onboarding");
      setLoading(null);
    }
  };

  const syncStatus = async () => {
    try {
      setLoading("sync");
      await refresh();
      await qc.invalidateQueries({ queryKey: ["seller"] });
      toast.success("Status atualizado");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao sincronizar");
    } finally {
      setLoading(null);
    }
  };

  const openDashboard = async () => {
    try {
      setLoading("dash");
      const { url } = await dashboard();
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={`mt-6 border rounded-xl p-5 ${isActive ? "bg-success/5 border-success/30" : "bg-amber-500/5 border-amber-500/30"}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          {isActive ? (
            <CheckCircle2 className="h-6 w-6 text-success shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div>
            <h3 className="font-bold flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Recebimentos (Stripe Connect)
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isActive
                ? "Sua conta está ativa. Você já pode receber pagamentos."
                : status === "restricted"
                ? "Sua conta está com restrições. Conclua as informações pendentes."
                : hasAccount
                ? "Onboarding incompleto. Finalize para começar a vender."
                : "Configure sua conta para receber pagamentos diretamente do Stripe."}
            </p>
            <div className="text-xs text-muted-foreground mt-1">
              Status: <span className="font-semibold uppercase">{status}</span>
              {" · "}Charges: {seller.stripe_charges_enabled ? "✓" : "✗"}
              {" · "}Payouts: {seller.stripe_payouts_enabled ? "✓" : "✗"}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!isActive && (
            <button
              onClick={startOnboarding}
              disabled={loading === "onboard"}
              className="h-10 px-4 rounded-lg bg-gradient-brand text-primary-foreground font-semibold text-sm disabled:opacity-60"
            >
              {loading === "onboard" ? "Abrindo..." : hasAccount ? "Continuar onboarding" : "Configurar pagamentos"}
            </button>
          )}
          {hasAccount && (
            <button
              onClick={syncStatus}
              disabled={loading === "sync"}
              className="h-10 px-4 rounded-lg border border-border font-semibold text-sm hover:bg-secondary disabled:opacity-60"
            >
              {loading === "sync" ? "..." : "Atualizar status"}
            </button>
          )}
          {isActive && (
            <>
              <button
                onClick={openDashboard}
                disabled={loading === "dash"}
                className="h-10 px-4 rounded-lg border border-border font-semibold text-sm hover:bg-secondary disabled:opacity-60"
              >
                Painel Stripe
              </button>
              <Link to="/seller/orders" className="h-10 px-4 rounded-lg border border-border font-semibold text-sm grid place-items-center hover:bg-secondary">
                <Package className="h-4 w-4 inline mr-1" /> Pedidos
              </Link>
              <Link to="/seller/customers" className="h-10 px-4 rounded-lg border border-border font-semibold text-sm grid place-items-center hover:bg-secondary">
                <Users className="h-4 w-4 inline mr-1" /> Clientes
              </Link>
              <Link to="/seller/coupons" className="h-10 px-4 rounded-lg border border-border font-semibold text-sm grid place-items-center hover:bg-secondary">
                <TicketPercent className="h-4 w-4 inline mr-1" /> Cupons
              </Link>
              <Link to="/seller/promotions" className="h-10 px-4 rounded-lg border border-border font-semibold text-sm grid place-items-center hover:bg-secondary">
                <Sparkles className="h-4 w-4 inline mr-1" /> Promoções
              </Link>
              <Link to="/seller/reviews" className="h-10 px-4 rounded-lg border border-border font-semibold text-sm grid place-items-center hover:bg-secondary">
                <MessageSquare className="h-4 w-4 inline mr-1" /> Avaliações
              </Link>
              <Link to="/seller/finance" className="h-10 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm grid place-items-center">
                <Wallet className="h-4 w-4 inline mr-1" /> Financeiro
              </Link>
            </>
          )}
        </div>
      </div>
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
  const [tab, setTab] = useState<"basic" | "media" | "specs" | "stock" | "variants" | "shipping">("basic");
  const [form, setForm] = useState<any>({
    title: product?.title ?? "",
    description: product?.description ?? "",
    price: product?.price ? String(product.price) : "",
    original_price: product?.original_price ? String(product.original_price) : "",
    category_id: (product as any)?.category_id ?? null,
    category_slug: product?.category_slug ?? "eletronicos",
    stock: product?.stock ?? 10,
    min_stock: (product as any)?.min_stock ?? 0,
    free_shipping: product?.free_shipping ?? false,
    is_active: product?.is_active ?? true,
    brand: (product as any)?.brand ?? "",
    model: (product as any)?.model ?? "",
    sku: (product as any)?.sku ?? "",
    barcode: (product as any)?.barcode ?? "",
    weight_g: (product as any)?.weight_g ?? "",
    height_cm: (product as any)?.height_cm ?? "",
    width_cm: (product as any)?.width_cm ?? "",
    length_cm: (product as any)?.length_cm ?? "",
    color: (product as any)?.color ?? "",
    material: (product as any)?.material ?? "",
    warranty: (product as any)?.warranty ?? "",
    condition: (product as any)?.condition ?? "new",
    origin_zip: (product as any)?.origin_zip ?? "",
    own_delivery: (product as any)?.own_delivery ?? false,
    carrier: (product as any)?.carrier ?? "",
  });

  const [variants, setVariants] = useState<VariantDraft[]>([]);

  // load existing images when editing
  const { data: existingImages = [] } = useQuery({
    queryKey: ["product-images", product?.id],
    enabled: !!product?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("id,url,storage_path,is_primary")
        .eq("product_id", product!.id)
        .order("position");
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        id: d.id,
        url: d.url,
        storage_path: d.storage_path ?? "",
        is_primary: !!d.is_primary,
      }));
    },
  });

  const [images, setImages] = useState<any[]>([]);
  useEffect(() => { setImages(existingImages); }, [existingImages]);

  // load existing variants when editing
  const { data: existingVariants = [] } = useQuery({
    queryKey: ["product-variants", product?.id],
    enabled: !!product?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("id,option1_name,option1_value,option2_name,option2_value,sku,price,stock,min_stock,is_active")
        .eq("product_id", product!.id)
        .order("position");
      if (error) throw error;
      return (data ?? []).map((v: any) => ({
        id: v.id,
        option1_name: v.option1_name ?? "",
        option1_value: v.option1_value ?? "",
        option2_name: v.option2_name ?? "",
        option2_value: v.option2_value ?? "",
        sku: v.sku ?? "",
        price: v.price != null ? String(v.price) : "",
        stock: String(v.stock ?? 0),
        min_stock: String(v.min_stock ?? 0),
        is_active: !!v.is_active,
      })) as VariantDraft[];
    },
  });
  useEffect(() => { setVariants(existingVariants); }, [existingVariants]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const primary = images.find((i) => i.is_primary) ?? images[0];
      const payload: any = {
        seller_id: sellerId,
        title: form.title,
        description: form.description || null,
        price: Number(form.price),
        original_price: form.original_price ? Number(form.original_price) : null,
        category_slug: form.category_slug,
        category_id: form.category_id,
        image_url: primary?.url ?? null,
        stock: Number(form.stock),
        min_stock: Number(form.min_stock) || 0,
        free_shipping: form.free_shipping,
        is_active: form.is_active,
        brand: form.brand || null,
        model: form.model || null,
        sku: form.sku || null,
        barcode: form.barcode || null,
        weight_g: form.weight_g ? Number(form.weight_g) : null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        width_cm: form.width_cm ? Number(form.width_cm) : null,
        length_cm: form.length_cm ? Number(form.length_cm) : null,
        color: form.color || null,
        material: form.material || null,
        warranty: form.warranty || null,
        condition: form.condition,
        origin_zip: form.origin_zip || null,
        own_delivery: form.own_delivery,
        carrier: form.carrier || null,
        has_variants: variants.length > 0,
      };

      let productId = product?.id;
      if (product) {
        const { error } = await supabase.from("products").update(payload).eq("id", product.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        productId = data!.id;
      }

      // sync images
      if (productId) {
        await supabase.from("product_images").delete().eq("product_id", productId);
        if (images.length) {
          const rows = images.map((img, idx) => ({
            product_id: productId!,
            url: img.url,
            storage_path: img.storage_path,
            position: idx,
            is_primary: img.is_primary,
          }));
          const { error } = await supabase.from("product_images").insert(rows);
          if (error) throw error;
        }

        // sync variants: replace
        await supabase.from("product_variants").delete().eq("product_id", productId);
        if (variants.length) {
          const rows = variants.map((v, idx) => ({
            product_id: productId!,
            seller_id: sellerId,
            option1_name: v.option1_name || null,
            option1_value: v.option1_value || null,
            option2_name: v.option2_name || null,
            option2_value: v.option2_value || null,
            sku: v.sku || null,
            price: v.price ? Number(v.price) : null,
            stock: Number(v.stock) || 0,
            min_stock: Number(v.min_stock) || 0,
            is_active: v.is_active,
            position: idx,
          }));
          const { error } = await supabase.from("product_variants").insert(rows);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success(product ? "Produto atualizado" : "Produto criado");
      qc.invalidateQueries({ queryKey: ["seller-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product-variants", product?.id] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "basic", label: "Básico" },
    { id: "media", label: "Mídias" },
    { id: "specs", label: "Especificações" },
    { id: "stock", label: "Estoque" },
    { id: "variants", label: `Variações${variants.length ? ` (${variants.length})` : ""}` },
    { id: "shipping", label: "Frete" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); saveMut.mutate(); }}
        className="bg-card border border-border rounded-2xl w-full max-w-3xl p-6 shadow-brand my-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black">{product ? "Editar produto" : "Novo produto"}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex gap-1 border-b border-border mb-4 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 h-10 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px ${
                tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "basic" && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Título" className="sm:col-span-2">
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
            </Field>
            <Field label="Categoria" className="sm:col-span-2">
              <CategorySelect
                value={{ categoryId: form.category_id, categorySlug: form.category_slug }}
                onChange={(v) => setForm({ ...form, category_id: v.categoryId, category_slug: v.categorySlug })}
              />
            </Field>
            <Field label="Preço (R$)">
              <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" />
            </Field>
            <Field label="Preço original (riscado)">
              <input type="number" min="0" step="0.01" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} className="input" />
            </Field>
            <Field label="Condição">
              <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="input">
                <option value="new">Novo</option>
                <option value="refurbished">Seminovo</option>
                <option value="used">Usado</option>
              </select>
            </Field>
            <Field label="Garantia">
              <input value={form.warranty} onChange={(e) => setForm({ ...form, warranty: e.target.value })} placeholder="ex: 12 meses" className="input" />
            </Field>
            <Field label="Descrição" className="sm:col-span-2">
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="input" />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Ativo (visível na loja)
            </label>
          </div>
        )}

        {tab === "media" && (
          <ProductImageUploader sellerId={sellerId} value={images} onChange={setImages} />
        )}

        {tab === "specs" && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Marca"><input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input" /></Field>
            <Field label="Modelo"><input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="input" /></Field>
            <Field label="SKU"><input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input" /></Field>
            <Field label="Código de barras"><input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="input" /></Field>
            <Field label="Cor"><input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="input" /></Field>
            <Field label="Material"><input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} className="input" /></Field>
          </div>
        )}

        {tab === "stock" && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Estoque atual">
              <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className="input" />
            </Field>
            <Field label="Estoque mínimo (alerta)">
              <input type="number" min="0" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })} className="input" />
            </Field>
            {Number(form.stock) <= Number(form.min_stock) && Number(form.min_stock) > 0 && (
              <p className="sm:col-span-2 text-xs text-amber-600 font-semibold">⚠ Estoque abaixo ou igual ao mínimo definido.</p>
            )}
            <p className="sm:col-span-2 text-xs text-muted-foreground">
              Quando o produto tiver variações, o estoque por variação tem prioridade sobre este campo.
            </p>
          </div>
        )}

        {tab === "variants" && (
          <VariantsEditor value={variants} onChange={setVariants} />
        )}

        {tab === "shipping" && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Peso (g)"><input type="number" min="0" value={form.weight_g} onChange={(e) => setForm({ ...form, weight_g: e.target.value })} className="input" /></Field>
            <Field label="CEP de origem"><input value={form.origin_zip} onChange={(e) => setForm({ ...form, origin_zip: e.target.value })} placeholder="00000-000" className="input" /></Field>
            <Field label="Altura (cm)"><input type="number" min="0" step="0.1" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} className="input" /></Field>
            <Field label="Largura (cm)"><input type="number" min="0" step="0.1" value={form.width_cm} onChange={(e) => setForm({ ...form, width_cm: e.target.value })} className="input" /></Field>
            <Field label="Comprimento (cm)"><input type="number" min="0" step="0.1" value={form.length_cm} onChange={(e) => setForm({ ...form, length_cm: e.target.value })} className="input" /></Field>
            <Field label="Transportadora">
              <select value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} className="input">
                <option value="">Selecione</option>
                <option value="correios">Correios</option>
                <option value="jadlog">Jadlog</option>
                <option value="loggi">Loggi</option>
                <option value="azul_cargo">Azul Cargo</option>
                <option value="outra">Outra</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={form.free_shipping} onChange={(e) => setForm({ ...form, free_shipping: e.target.checked })} />
              Frete grátis
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={form.own_delivery} onChange={(e) => setForm({ ...form, own_delivery: e.target.checked })} />
              Entrega própria (sem transportadora)
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
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
