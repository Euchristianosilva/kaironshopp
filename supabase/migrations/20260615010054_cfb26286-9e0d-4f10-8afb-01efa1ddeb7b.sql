CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
  END
$function$;

CREATE OR REPLACE FUNCTION public.user_is_order_buyer(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN false
    ELSE EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id AND buyer_id = _user_id)
  END
$function$;

CREATE OR REPLACE FUNCTION public.user_owns_order_item(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.sellers s ON s.id = oi.seller_id
      WHERE oi.order_id = _order_id AND s.owner_id = _user_id
    )
  END
$function$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_is_order_buyer(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_owns_order_item(uuid, uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_is_order_buyer(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_owns_order_item(uuid, uuid) FROM anon, PUBLIC;