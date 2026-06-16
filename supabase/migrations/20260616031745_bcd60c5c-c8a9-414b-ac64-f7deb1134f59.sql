
REVOKE EXECUTE ON FUNCTION public.is_support_agent(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.support_agent_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.on_new_support_message() FROM PUBLIC, anon, authenticated;
