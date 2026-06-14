import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ProductsTable } from "@/components/seller/ProductsTable";
import { ProductImageUploader } from "@/components/seller/ProductImageUploader";
import { TurbinarProductDialog } from "@/components/seller/TurbinarProductDialog";
import { CategorySelect } from "@/components/seller/CategorySelect";
import { VariantsEditor, type VariantDraft } from "@/components/seller/VariantsEditor";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/products")({
  head: () => ({ meta: [{ title: "Produtos — Painel do Vendedor" }] }),
  component: ProductsPage,
});

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

function ProductsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ProductRow | "new" | null>(null);
  const [boosting, setBoosting] = useState<ProductRow | null>(null);

  const { data: seller } = useQuery({
    queryKey: ["seller", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("sellers").select("id").eq("owner_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [], isLoading } = useQuery<ProductRow[]>({
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
    onSuccess: () => { toast.success("Produto removido"); qc.invalidateQueries({ queryKey: ["seller-products"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActiveMut = useMutation({
    mutationFn: async (p: ProductRow) => {
      const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status atualizado"); qc.invalidateQueries({ queryKey: ["seller-products"] }); },
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
    onSuccess: () => { toast.success("Produto duplicado"); qc.invalidateQueries({ queryKey: ["seller-products"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!seller) return <div className="text-muted-foreground">Carregando...</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <SellerPageHeader
        title="Produtos"
        description="Gerencie seu catálogo, estoque e variações."
        actions={
          <button onClick={() => setEditing("new")} className="h-10 px-4 rounded-lg bg-gradient-brand text-primary-foreground font-semibold text-sm flex items-center gap-2 hover:opacity-95">
            <Plus className="h-4 w-4" /> Novo produto
          </button>
        }
      />

      <div className="bg-card border border-border rounded-xl p-1 sm:p-2">
        <ProductsTable
          products={products as any}
          loading={isLoading}
          onEdit={(p) => setEditing(p as any)}
          onDelete={(p) => deleteMut.mutate(p.id)}
          onToggleActive={(p) => toggleActiveMut.mutate(p as any)}
          onDuplicate={(p) => duplicateMut.mutate(p as any)}
          onBoost={(p) => setBoosting(p as any)}
        />
      </div>

      {editing && (
        <ProductFormModal
          sellerId={seller.id}
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      {boosting && (
        <TurbinarProductDialog
          product={{
            id: boosting.id,
            title: boosting.title,
            price: boosting.price,
            image_url: boosting.image_url,
          }}
          onClose={() => setBoosting(null)}
        />
      )}
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
    own_delivery: (product as any)?.own_delivery ?? false,
    carrier: (product as any)?.carrier ?? "",
  });
  const [variants, setVariants] = useState<VariantDraft[]>([]);

  const { data: existingImages = [] } = useQuery({
    queryKey: ["product-images", product?.id],
    enabled: !!product?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("product_images").select("id,url,storage_path,is_primary").eq("product_id", product!.id).order("position");
      if (error) throw error;
      return (data ?? []).map((d: any) => ({ id: d.id, url: d.url, storage_path: d.storage_path ?? "", is_primary: !!d.is_primary }));
    },
  });
  const [images, setImages] = useState<any[]>([]);
  useEffect(() => { setImages(existingImages); }, [existingImages]);

  const { data: existingVariants = [] } = useQuery({
    queryKey: ["product-variants", product?.id],
    enabled: !!product?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("product_variants").select("id,option1_name,option1_value,option2_name,option2_value,sku,price,stock,min_stock,is_active").eq("product_id", product!.id).order("position");
      if (error) throw error;
      return (data ?? []).map((v: any) => ({
        id: v.id, option1_name: v.option1_name ?? "", option1_value: v.option1_value ?? "",
        option2_name: v.option2_name ?? "", option2_value: v.option2_value ?? "",
        sku: v.sku ?? "", price: v.price != null ? String(v.price) : "",
        stock: String(v.stock ?? 0), min_stock: String(v.min_stock ?? 0), is_active: !!v.is_active,
      })) as VariantDraft[];
    },
  });
  useEffect(() => { setVariants(existingVariants); }, [existingVariants]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const primary = images.find((i) => i.is_primary) ?? images[0];
      const payload: any = {
        seller_id: sellerId,
        title: form.title, description: form.description || null,
        price: Number(form.price),
        original_price: form.original_price ? Number(form.original_price) : null,
        category_slug: form.category_slug, category_id: form.category_id,
        image_url: primary?.url ?? null,
        stock: Number(form.stock), min_stock: Number(form.min_stock) || 0,
        free_shipping: form.free_shipping, is_active: form.is_active,
        brand: form.brand || null, model: form.model || null, sku: form.sku || null, barcode: form.barcode || null,
        weight_g: form.weight_g ? Number(form.weight_g) : null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        width_cm: form.width_cm ? Number(form.width_cm) : null,
        length_cm: form.length_cm ? Number(form.length_cm) : null,
        color: form.color || null, material: form.material || null, warranty: form.warranty || null,
        condition: form.condition,
        own_delivery: form.own_delivery, carrier: form.carrier || null,
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
      if (productId) {
        await supabase.from("product_images").delete().eq("product_id", productId);
        if (images.length) {
          const rows = images.map((img, idx) => ({
            product_id: productId!, url: img.url, storage_path: img.storage_path,
            position: idx, is_primary: img.is_primary,
          }));
          const { error } = await supabase.from("product_images").insert(rows);
          if (error) throw error;
        }
        await supabase.from("product_variants").delete().eq("product_id", productId);
        if (variants.length) {
          const rows = variants.map((v, idx) => ({
            product_id: productId!, seller_id: sellerId,
            option1_name: v.option1_name || null, option1_value: v.option1_value || null,
            option2_name: v.option2_name || null, option2_value: v.option2_value || null,
            sku: v.sku || null, price: v.price ? Number(v.price) : null,
            stock: Number(v.stock) || 0, min_stock: Number(v.min_stock) || 0,
            is_active: v.is_active, position: idx,
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
      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); saveMut.mutate(); }} className="bg-card border border-border rounded-2xl w-full max-w-3xl p-6 shadow-brand my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black">{product ? "Editar produto" : "Novo produto"}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex gap-1 border-b border-border mb-4 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`px-4 h-10 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "basic" && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Título" className="sm:col-span-2"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" /></Field>
            <Field label="Categoria" className="sm:col-span-2">
              <CategorySelect value={{ categoryId: form.category_id, categorySlug: form.category_slug }} onChange={(v) => setForm({ ...form, category_id: v.categoryId, category_slug: v.categorySlug })} />
            </Field>
            <Field label="Preço (R$)"><input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" /></Field>
            <Field label="Preço original (riscado)"><input type="number" min="0" step="0.01" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} className="input" /></Field>
            <Field label="Condição">
              <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="input">
                <option value="new">Novo</option><option value="refurbished">Seminovo</option><option value="used">Usado</option>
              </select>
            </Field>
            <Field label="Garantia"><input value={form.warranty} onChange={(e) => setForm({ ...form, warranty: e.target.value })} placeholder="ex: 12 meses" className="input" /></Field>
            <Field label="Descrição" className="sm:col-span-2"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="input" /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Ativo (visível na loja)</label>
          </div>
        )}
        {tab === "media" && <ProductImageUploader sellerId={sellerId} value={images} onChange={setImages} />}
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
            <Field label="Estoque atual"><input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className="input" /></Field>
            <Field label="Estoque mínimo (alerta)"><input type="number" min="0" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })} className="input" /></Field>
            {Number(form.stock) <= Number(form.min_stock) && Number(form.min_stock) > 0 && (
              <p className="sm:col-span-2 text-xs text-amber-600 font-semibold">⚠ Estoque abaixo ou igual ao mínimo definido.</p>
            )}
          </div>
        )}
        {tab === "variants" && <VariantsEditor value={variants} onChange={setVariants} />}
        {tab === "shipping" && (
          <div className="grid sm:grid-cols-2 gap-3">
            <p className="sm:col-span-2 text-xs text-muted-foreground bg-secondary/50 border border-border rounded p-3">
              ℹ O CEP de origem é o da sua loja e é configurado uma única vez em{" "}
              <a href="/seller/shipping" className="text-primary font-semibold hover:underline">Configurações de Envio</a>.
              Aqui você informa apenas peso e dimensões do produto.
            </p>
            <Field label="Peso (g)"><input type="number" min="0" value={form.weight_g} onChange={(e) => setForm({ ...form, weight_g: e.target.value })} className="input" /></Field>
            <Field label="Altura (cm)"><input type="number" min="0" step="0.1" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} className="input" /></Field>
            <Field label="Largura (cm)"><input type="number" min="0" step="0.1" value={form.width_cm} onChange={(e) => setForm({ ...form, width_cm: e.target.value })} className="input" /></Field>
            <Field label="Comprimento (cm)"><input type="number" min="0" step="0.1" value={form.length_cm} onChange={(e) => setForm({ ...form, length_cm: e.target.value })} className="input" /></Field>
            <Field label="Transportadora">
              <select value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} className="input">
                <option value="">Selecione</option><option value="correios">Correios</option><option value="jadlog">Jadlog</option><option value="loggi">Loggi</option><option value="azul_cargo">Azul Cargo</option><option value="outra">Outra</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.free_shipping} onChange={(e) => setForm({ ...form, free_shipping: e.target.checked })} /> Frete grátis</label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.own_delivery} onChange={(e) => setForm({ ...form, own_delivery: e.target.checked })} /> Entrega própria</label>
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
