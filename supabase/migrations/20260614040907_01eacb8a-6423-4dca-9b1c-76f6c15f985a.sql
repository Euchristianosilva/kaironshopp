
-- Enum condição
DO $$ BEGIN
  CREATE TYPE public.product_condition AS ENUM ('new','refurbished','used');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Novos campos em products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS weight_g integer,
  ADD COLUMN IF NOT EXISTS height_cm numeric(10,2),
  ADD COLUMN IF NOT EXISTS width_cm numeric(10,2),
  ADD COLUMN IF NOT EXISTS length_cm numeric(10,2),
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS material text,
  ADD COLUMN IF NOT EXISTS warranty text,
  ADD COLUMN IF NOT EXISTS condition public.product_condition NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category_id uuid;

-- Tabela product_images
CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  storage_path text,
  position integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_images_public_read" ON public.product_images
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND (p.is_active OR public.has_role(auth.uid(),'admin')))
);

CREATE POLICY "product_images_seller_write" ON public.product_images
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.sellers s ON s.id = p.seller_id
    WHERE p.id = product_images.product_id AND s.owner_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.sellers s ON s.id = p.seller_id
    WHERE p.id = product_images.product_id AND s.owner_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id, position);

-- Tabela categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  icon text,
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_admin_write" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id, position);

-- Seed categorias raiz + subcategorias
WITH roots AS (
  INSERT INTO public.categories (slug, name, position) VALUES
    ('eletronicos','Eletrônicos',1),
    ('moda','Moda',2),
    ('casa','Casa',3),
    ('esportes','Esportes',4),
    ('beleza','Beleza',5),
    ('brinquedos','Brinquedos',6),
    ('livros','Livros',7),
    ('automotivo','Automotivo',8)
  ON CONFLICT (slug) DO NOTHING
  RETURNING id, slug
)
INSERT INTO public.categories (parent_id, slug, name, position)
SELECT r.id, sub.slug, sub.name, sub.pos FROM roots r
JOIN (VALUES
  ('eletronicos','celulares','Celulares',1),
  ('eletronicos','tablets','Tablets',2),
  ('eletronicos','tvs','TVs',3),
  ('eletronicos','notebooks','Notebooks',4),
  ('eletronicos','audio','Áudio',5),
  ('eletronicos','games','Games',6),
  ('moda','masculino','Masculino',1),
  ('moda','feminino','Feminino',2),
  ('moda','infantil','Infantil',3),
  ('moda','calcados','Calçados',4),
  ('moda','acessorios','Acessórios',5),
  ('casa','cozinha','Cozinha',1),
  ('casa','banheiro','Banheiro',2),
  ('casa','sala','Sala',3),
  ('casa','quarto','Quarto',4),
  ('casa','jardim','Jardim',5),
  ('esportes','fitness','Fitness',1),
  ('esportes','futebol','Futebol',2),
  ('esportes','ciclismo','Ciclismo',3),
  ('beleza','perfumes','Perfumes',1),
  ('beleza','maquiagem','Maquiagem',2),
  ('beleza','cabelos','Cabelos',3),
  ('brinquedos','bebes','Bebês',1),
  ('brinquedos','educativos','Educativos',2),
  ('livros','literatura','Literatura',1),
  ('livros','tecnicos','Técnicos',2),
  ('automotivo','acessorios-auto','Acessórios',1),
  ('automotivo','pecas','Peças',2)
) AS sub(parent_slug, slug, name, pos) ON sub.parent_slug = r.slug
ON CONFLICT (slug) DO NOTHING;
