DROP POLICY IF EXISTS support_agents_self_select ON public.support_agents;
DROP POLICY IF EXISTS support_agents_admin_all ON public.support_agents;
DROP POLICY IF EXISTS "support_msgs_insert" ON public.support_messages;
DROP POLICY IF EXISTS "support_msgs_select" ON public.support_messages;
DROP POLICY IF EXISTS "tickets_seller_select" ON public.support_tickets;
DROP POLICY IF EXISTS "tickets_update_owner_or_support" ON public.support_tickets;

CREATE POLICY support_agents_self_select ON public.support_agents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY support_agents_admin_all ON public.support_agents
  FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "tickets_seller_select" ON public.support_tickets
  FOR SELECT TO authenticated USING (
    opened_by = auth.uid()
    OR app_private.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.support_can_view_ticket(auth.uid(), department)
  );

CREATE POLICY "tickets_update_owner_or_support" ON public.support_tickets
  FOR UPDATE TO authenticated USING (
    opened_by = auth.uid()
    OR app_private.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.support_can_view_ticket(auth.uid(), department)
  ) WITH CHECK (
    opened_by = auth.uid()
    OR app_private.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.support_can_view_ticket(auth.uid(), department)
  );

CREATE POLICY "support_msgs_select" ON public.support_messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id
      AND (
        t.opened_by = auth.uid()
        OR public.support_can_view_ticket(auth.uid(), t.department)
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
            AND (public.is_support_agent(auth.uid()) OR app_private.has_role(auth.uid(), 'admin'::public.app_role)))
      )
    )
  );

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;