CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
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

CREATE OR REPLACE FUNCTION app_private.user_is_order_buyer(_user_id uuid, _order_id uuid)
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

CREATE OR REPLACE FUNCTION app_private.user_owns_order_item(_user_id uuid, _order_id uuid)
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

GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.user_is_order_buyer(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.user_owns_order_item(uuid, uuid) TO authenticated, service_role;

DO $$
DECLARE
  p record;
  new_qual text;
  new_check text;
  sql text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        qual ILIKE '%has_role(%' OR with_check ILIKE '%has_role(%'
        OR qual ILIKE '%user_is_order_buyer(%' OR with_check ILIKE '%user_is_order_buyer(%'
        OR qual ILIKE '%user_owns_order_item(%' OR with_check ILIKE '%user_owns_order_item(%'
      )
  LOOP
    new_qual := p.qual;
    new_check := p.with_check;

    IF new_qual IS NOT NULL THEN
      new_qual := replace(new_qual, 'public.has_role(', 'app_private.has_role(');
      new_qual := replace(new_qual, 'has_role(', 'app_private.has_role(');
      new_qual := replace(new_qual, 'public.user_is_order_buyer(', 'app_private.user_is_order_buyer(');
      new_qual := replace(new_qual, 'user_is_order_buyer(', 'app_private.user_is_order_buyer(');
      new_qual := replace(new_qual, 'public.user_owns_order_item(', 'app_private.user_owns_order_item(');
      new_qual := replace(new_qual, 'user_owns_order_item(', 'app_private.user_owns_order_item(');
    END IF;

    IF new_check IS NOT NULL THEN
      new_check := replace(new_check, 'public.has_role(', 'app_private.has_role(');
      new_check := replace(new_check, 'has_role(', 'app_private.has_role(');
      new_check := replace(new_check, 'public.user_is_order_buyer(', 'app_private.user_is_order_buyer(');
      new_check := replace(new_check, 'user_is_order_buyer(', 'app_private.user_is_order_buyer(');
      new_check := replace(new_check, 'public.user_owns_order_item(', 'app_private.user_owns_order_item(');
      new_check := replace(new_check, 'user_owns_order_item(', 'app_private.user_owns_order_item(');
    END IF;

    sql := format('ALTER POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    IF new_qual IS NOT NULL THEN
      sql := sql || format(' USING (%s)', new_qual);
    END IF;
    IF new_check IS NOT NULL THEN
      sql := sql || format(' WITH CHECK (%s)', new_check);
    END IF;
    EXECUTE sql;
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_is_order_buyer(uuid, uuid) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_owns_order_item(uuid, uuid) FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_is_order_buyer(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_owns_order_item(uuid, uuid) TO service_role;