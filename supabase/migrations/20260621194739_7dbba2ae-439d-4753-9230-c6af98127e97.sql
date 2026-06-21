-- 1) Scope coupons seller-manage policy to authenticated only
DROP POLICY IF EXISTS "coupons seller manage" ON public.coupons;
CREATE POLICY "coupons seller manage" ON public.coupons
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = coupons.seller_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = coupons.seller_id AND s.owner_id = auth.uid()));

-- 2) Block anonymous role enumeration via has_role
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 3) Hide sensitive Stripe / fee columns from direct Data API reads.
--    Server functions that need them must use the service_role client.
REVOKE SELECT (stripe_account_id, stripe_transfer_id, platform_fee_cents, seller_net_cents)
  ON public.order_items FROM authenticated, anon;

REVOKE SELECT (stripe_session_id, stripe_payment_intent_id, shipping_label_url, platform_fee_cents)
  ON public.orders FROM authenticated, anon;

REVOKE SELECT (stripe_account_id, stripe_payout_id)
  ON public.payouts FROM authenticated, anon;