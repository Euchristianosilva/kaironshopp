
-- Fix sellers PII exposure and coupon enumeration

-- 1) SELLERS: drop the broad public read, restrict direct access to owners/admins,
--    expose only safe storefront columns through a view.
DROP POLICY IF EXISTS "sellers_public_read" ON public.sellers;

-- Owner/admin already covered by sellers_owner_write (FOR ALL). Add an explicit
-- SELECT policy to make intent clear and to allow authenticated buyers/sellers
-- to look up *non-PII* data only through the view below (the view runs as
-- definer and bypasses table RLS, so this policy stays restrictive).

-- Safe storefront view (SECURITY DEFINER semantics so it bypasses table RLS).
DROP VIEW IF EXISTS public.sellers_public;
CREATE VIEW public.sellers_public AS
SELECT
  id,
  owner_id,
  slug,
  name,
  description,
  logo_url,
  banner_url,
  rating,
  seo_title,
  seo_description,
  seo_keywords,
  shipping_policy,
  return_policy,
  terms,
  vacation_mode,
  status,
  stripe_charges_enabled,
  stripe_payouts_enabled,
  stripe_onboarding_status,
  created_at,
  updated_at
FROM public.sellers;

GRANT SELECT ON public.sellers_public TO anon, authenticated;
GRANT ALL    ON public.sellers_public TO service_role;

-- 2) COUPONS: remove blanket authenticated read. Sellers can still manage
--    their own coupons via the existing "coupons seller manage" FOR ALL policy.
DROP POLICY IF EXISTS "coupons authenticated read active" ON public.coupons;

-- Validator function for buyer-side coupon lookup (scoped to a single seller+code).
CREATE OR REPLACE FUNCTION public.validate_coupon(_seller_id uuid, _code text)
RETURNS TABLE (
  id uuid,
  seller_id uuid,
  code text,
  discount_type text,
  discount_value numeric,
  min_purchase_cents integer,
  valid_from timestamptz,
  valid_until timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.seller_id, c.code, c.discount_type, c.discount_value,
         c.min_purchase_cents, c.valid_from, c.valid_until
  FROM public.coupons c
  WHERE c.seller_id = _seller_id
    AND upper(c.code) = upper(_code)
    AND c.active = true
    AND (c.valid_from IS NULL OR c.valid_from <= now())
    AND (c.valid_until IS NULL OR c.valid_until >= now())
    AND (c.max_uses IS NULL OR c.uses_count < c.max_uses)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.validate_coupon(uuid, text) TO anon, authenticated;
