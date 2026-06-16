
-- Revoke column-level read access on seller PII from public roles.
-- service_role retains full access (used by trusted server code).
REVOKE SELECT (
  email, phone, whatsapp,
  origin_zip, origin_state, origin_city, origin_district,
  origin_address, origin_number, origin_complement,
  stripe_account_id
) ON public.sellers FROM anon, authenticated;

-- Owner self-read: returns the caller's seller row in full.
CREATE OR REPLACE FUNCTION public.get_my_seller()
RETURNS public.sellers
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.*
  FROM public.sellers s
  WHERE auth.uid() IS NOT NULL
    AND s.owner_id = auth.uid()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_my_seller() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_seller() TO authenticated;

-- Owner-or-admin read by seller id: returns full row only when allowed.
CREATE OR REPLACE FUNCTION public.get_seller_for_owner(_seller_id uuid)
RETURNS public.sellers
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.*
  FROM public.sellers s
  WHERE s.id = _seller_id
    AND auth.uid() IS NOT NULL
    AND (
      s.owner_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_seller_for_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_seller_for_owner(uuid) TO authenticated;
