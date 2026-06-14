
-- Phase 2: variations, advanced stock, shipping fields

-- 1. Shipping & stock fields on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS min_stock integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS origin_zip text,
  ADD COLUMN IF NOT EXISTS own_delivery boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS carrier text,
  ADD COLUMN IF NOT EXISTS has_variants boolean NOT NULL DEFAULT false;

-- 2. product_variants
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  option1_name text,
  option1_value text,
  option2_name text,
  option2_value text,
  sku text,
  price numeric(12,2),
  stock integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_variants_product_idx ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS product_variants_seller_idx ON public.product_variants(seller_id);

GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active variants" ON public.product_variants
  FOR SELECT USING (true);

CREATE POLICY "Sellers manage own variants" ON public.product_variants
  FOR ALL TO authenticated
  USING (seller_id IN (SELECT id FROM public.sellers WHERE owner_id = auth.uid()))
  WITH CHECK (seller_id IN (SELECT id FROM public.sellers WHERE owner_id = auth.uid()));

CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. stock_movements (audit / history)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('in','out','adjust','sale','return')),
  quantity integer NOT NULL,
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_movements_seller_idx ON public.stock_movements(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON public.stock_movements(product_id);

GRANT SELECT, INSERT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers read own stock movements" ON public.stock_movements
  FOR SELECT TO authenticated
  USING (seller_id IN (SELECT id FROM public.sellers WHERE owner_id = auth.uid()));

CREATE POLICY "Sellers insert own stock movements" ON public.stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (seller_id IN (SELECT id FROM public.sellers WHERE owner_id = auth.uid()));

-- 4. order_items: variant reference
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_label text;
