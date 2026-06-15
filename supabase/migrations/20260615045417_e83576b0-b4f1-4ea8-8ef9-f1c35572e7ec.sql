
-- Public read for site-assets, admin-only writes
CREATE POLICY "site_assets_public_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'site-assets');

CREATE POLICY "site_assets_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "site_assets_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "site_assets_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Extend ad_placement enum with new manual placements
ALTER TYPE public.ad_placement ADD VALUE IF NOT EXISTS 'banner_principal';
ALTER TYPE public.ad_placement ADD VALUE IF NOT EXISTS 'destaque_home';
ALTER TYPE public.ad_placement ADD VALUE IF NOT EXISTS 'patrocinado';
ALTER TYPE public.ad_placement ADD VALUE IF NOT EXISTS 'vitrine_topo';
ALTER TYPE public.ad_placement ADD VALUE IF NOT EXISTS 'categoria';
ALTER TYPE public.ad_placement ADD VALUE IF NOT EXISTS 'busca';
ALTER TYPE public.ad_placement ADD VALUE IF NOT EXISTS 'premium';

-- Track which admin manually activated a campaign and when
ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS activated_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_manual boolean NOT NULL DEFAULT false;
