
-- 1. product_variants: hide inactive variants from public
DROP POLICY IF EXISTS "Anyone reads active variants" ON public.product_variants;
CREATE POLICY "Public reads active variants"
  ON public.product_variants
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    OR seller_id IN (SELECT id FROM public.sellers WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 2. sellers: revoke PII column SELECT from authenticated (storefront only sees public columns)
REVOKE SELECT (
  email, phone, whatsapp,
  document, pix_key, stripe_account_id,
  origin_zip, origin_state, origin_city, origin_district,
  origin_address, origin_number, origin_complement
) ON public.sellers FROM authenticated;

-- Grant back SELECT on safe public storefront columns
GRANT SELECT (
  id, owner_id, slug, name, description, logo_url, banner_url, rating,
  stripe_charges_enabled, stripe_payouts_enabled, stripe_onboarding_status,
  seo_title, seo_description, seo_keywords,
  shipping_policy, return_policy, terms, vacation_mode,
  status, category, created_at, updated_at
) ON public.sellers TO authenticated;

-- 3. SECURITY DEFINER functions: revoke anon EXECUTE
REVOKE EXECUTE ON FUNCTION public.get_my_seller() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_seller_for_owner(uuid) FROM anon;
