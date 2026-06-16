CREATE OR REPLACE FUNCTION app_private.is_support_agent(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.support_agents
    WHERE user_id = _uid AND active
  )
$$;

CREATE OR REPLACE FUNCTION app_private.support_agent_role(_uid uuid)
RETURNS public.support_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.support_agents
  WHERE user_id = _uid AND active
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION app_private.support_can_view_ticket(_uid uuid, _ticket_dept public.support_department)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.support_agents a
    WHERE a.user_id = _uid AND a.active
      AND (a.role = 'manager' OR a.department = _ticket_dept)
  )
$$;

GRANT EXECUTE ON FUNCTION app_private.is_support_agent(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.support_agent_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.support_can_view_ticket(uuid, public.support_department) TO authenticated, service_role;

DROP POLICY IF EXISTS "support_msgs_insert" ON public.support_messages;
DROP POLICY IF EXISTS "support_msgs_select" ON public.support_messages;
DROP POLICY IF EXISTS "tickets_seller_select" ON public.support_tickets;
DROP POLICY IF EXISTS "tickets_update_owner_or_support" ON public.support_tickets;

CREATE POLICY "tickets_seller_select" ON public.support_tickets
  FOR SELECT TO authenticated USING (
    opened_by = auth.uid()
    OR app_private.has_role(auth.uid(), 'admin'::public.app_role)
    OR app_private.support_can_view_ticket(auth.uid(), department)
  );

CREATE POLICY "tickets_update_owner_or_support" ON public.support_tickets
  FOR UPDATE TO authenticated USING (
    opened_by = auth.uid()
    OR app_private.has_role(auth.uid(), 'admin'::public.app_role)
    OR app_private.support_can_view_ticket(auth.uid(), department)
  ) WITH CHECK (
    opened_by = auth.uid()
    OR app_private.has_role(auth.uid(), 'admin'::public.app_role)
    OR app_private.support_can_view_ticket(auth.uid(), department)
  );

CREATE POLICY "support_msgs_select" ON public.support_messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id
      AND (
        t.opened_by = auth.uid()
        OR app_private.support_can_view_ticket(auth.uid(), t.department)
        OR app_private.has_role(auth.uid(), 'admin'::public.app_role)
      )
    )
  );

CREATE POLICY "support_msgs_insert" ON public.support_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id AND (
        (support_messages.sender_type = 'seller' AND t.opened_by = auth.uid())
        OR (support_messages.sender_type IN ('agent','system')
            AND (app_private.is_support_agent(auth.uid()) OR app_private.has_role(auth.uid(), 'admin'::public.app_role)))
      )
    )
  );

REVOKE EXECUTE ON FUNCTION public.is_support_agent(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.support_agent_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.support_can_view_ticket(uuid, public.support_department) FROM PUBLIC, anon, authenticated;