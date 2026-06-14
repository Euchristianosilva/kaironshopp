
REVOKE SELECT ON public.sellers FROM anon;
GRANT SELECT (
  id, owner_id, slug, name, description, logo_url, rating,
  created_at, updated_at, banner_url, seo_title, seo_description, seo_keywords,
  shipping_policy, return_policy, terms, vacation_mode
) ON public.sellers TO anon;

DROP POLICY IF EXISTS "coupons public read active" ON public.coupons;
CREATE POLICY "coupons authenticated read active"
  ON public.coupons FOR SELECT TO authenticated
  USING (active = true);
REVOKE SELECT ON public.coupons FROM anon;

DROP POLICY IF EXISTS "ad_campaigns owner insert" ON public.ad_campaigns;
CREATE POLICY "ad_campaigns owner insert"
  ON public.ad_campaigns FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.owner_id = auth.uid())
  );

CREATE POLICY "ad_campaigns owner update"
  ON public.ad_campaigns FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.owner_id = auth.uid())
  );

REVOKE EXECUTE ON FUNCTION public.user_is_order_buyer(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_order_item(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_is_order_buyer(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_owns_order_item(uuid, uuid) TO authenticated, service_role;
