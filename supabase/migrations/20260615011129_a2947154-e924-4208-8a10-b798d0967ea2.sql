CREATE OR REPLACE FUNCTION public.enforce_single_owner_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  target_email text;
BEGIN
  IF NEW.role NOT IN ('admin'::public.app_role, 'seller'::public.app_role, 'customer'::public.app_role) THEN
    RAISE EXCEPTION 'Invalid application role';
  END IF;

  IF NEW.role = 'admin'::public.app_role THEN
    SELECT lower(email) INTO target_email
    FROM auth.users
    WHERE id = NEW.user_id;

    IF target_email IS DISTINCT FROM 'kaironshopp@gmail.com' THEN
      RAISE EXCEPTION 'Only the platform owner can have the admin role';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.enforce_single_owner_admin_role() FROM PUBLIC, anon, authenticated;