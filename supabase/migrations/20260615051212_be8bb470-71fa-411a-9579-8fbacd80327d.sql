
-- Convert sellers_public to security_invoker (resolves Security Definer View linter)
ALTER VIEW public.sellers_public SET (security_invoker = on);

-- Allow SELECT on sellers at row level for anon/authenticated; column privileges
-- below limit what anonymous users can actually read.
CREATE POLICY "sellers_storefront_read"
  ON public.sellers
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Strip anonymous access to PII columns; grant only safe storefront columns to anon.
REVOKE SELECT ON public.sellers FROM anon;
GRANT SELECT (
  id, owner_id, slug, name, description, logo_url, banner_url, rating,
  seo_title, seo_description, seo_keywords,
  shipping_policy, return_policy, terms, vacation_mode, status,
  stripe_charges_enabled, stripe_payouts_enabled, stripe_onboarding_status,
  created_at, updated_at
) ON public.sellers TO anon;

-- Authenticated users keep full column-level SELECT (RLS still in force via policies).
GRANT SELECT ON public.sellers TO authenticated;

-- Remove the SECURITY DEFINER coupon validator (no client uses it yet); when
-- buyer-side coupon validation is needed, expose it through a server function
-- that uses the admin client with explicit validation instead.
DROP FUNCTION IF EXISTS public.validate_coupon(uuid, text);
