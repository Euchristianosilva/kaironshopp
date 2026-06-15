REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_is_order_buyer(uuid, uuid) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_owns_order_item(uuid, uuid) FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_is_order_buyer(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_owns_order_item(uuid, uuid) TO service_role;