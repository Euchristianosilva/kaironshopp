
-- 1) Restrict Stripe-sensitive columns on sellers from unauthenticated users
REVOKE SELECT ON public.sellers FROM anon;
GRANT SELECT (id, owner_id, slug, name, description, logo_url, created_at, updated_at)
  ON public.sellers TO anon;

-- 2) Remove buyer direct INSERT on orders / order_items — server-only via service role
DROP POLICY IF EXISTS orders_buyer_insert ON public.orders;
DROP POLICY IF EXISTS order_items_buyer_insert ON public.order_items;

-- 3) Remove broad admin write on user_roles — role grants happen server-side only
DROP POLICY IF EXISTS user_roles_admin_all ON public.user_roles;
CREATE POLICY user_roles_admin_read ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) Revoke EXECUTE on trigger-only SECURITY DEFINER functions from app roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_buyer_fulfillment_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_sellers_payment_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_sellers_new_order() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.on_new_message() FROM anon, authenticated, PUBLIC;
