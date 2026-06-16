
-- ENUMS
DO $$ BEGIN
  CREATE TYPE public.support_role AS ENUM ('agent','supervisor','manager');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM ('open','in_progress','waiting_seller','resolved','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_category AS ENUM ('financial','products','orders','shipping','technical','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- SUPPORT AGENTS
CREATE TABLE IF NOT EXISTS public.support_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.support_role NOT NULL DEFAULT 'agent',
  active boolean NOT NULL DEFAULT true,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_agents TO authenticated;
GRANT ALL ON public.support_agents TO service_role;
ALTER TABLE public.support_agents ENABLE ROW LEVEL SECURITY;

-- helper
CREATE OR REPLACE FUNCTION public.is_support_agent(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.support_agents WHERE user_id = _uid AND active) $$;

CREATE OR REPLACE FUNCTION public.support_agent_role(_uid uuid)
RETURNS public.support_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.support_agents WHERE user_id = _uid AND active LIMIT 1 $$;

CREATE POLICY support_agents_self_select ON public.support_agents
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY support_agents_admin_all ON public.support_agents
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- TICKETS
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL,
  opened_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category public.ticket_category NOT NULL DEFAULT 'other',
  status public.ticket_status NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  seller_unread int NOT NULL DEFAULT 0,
  agent_unread int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tickets_seller_select ON public.support_tickets
  FOR SELECT TO authenticated USING (
    opened_by = auth.uid()
    OR public.is_support_agent(auth.uid())
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY tickets_seller_insert ON public.support_tickets
  FOR INSERT TO authenticated WITH CHECK (opened_by = auth.uid());
CREATE POLICY tickets_update_owner_or_support ON public.support_tickets
  FOR UPDATE TO authenticated USING (
    opened_by = auth.uid()
    OR public.is_support_agent(auth.uid())
    OR public.has_role(auth.uid(),'admin')
  ) WITH CHECK (
    opened_by = auth.uid()
    OR public.is_support_agent(auth.uid())
    OR public.has_role(auth.uid(),'admin')
  );

CREATE INDEX IF NOT EXISTS idx_support_tickets_seller ON public.support_tickets(seller_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_opened_by ON public.support_tickets(opened_by);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_last_msg ON public.support_tickets(last_message_at DESC);

-- MESSAGES
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('seller','agent')),
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_msgs_select ON public.support_messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id
      AND (
        t.opened_by = auth.uid()
        OR public.is_support_agent(auth.uid())
        OR public.has_role(auth.uid(),'admin')
      )
    )
  );
CREATE POLICY support_msgs_insert ON public.support_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id
      AND (
        (sender_type = 'seller' AND t.opened_by = auth.uid())
        OR (sender_type = 'agent' AND (public.is_support_agent(auth.uid()) OR public.has_role(auth.uid(),'admin')))
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_messages(ticket_id, created_at);

-- TRIGGER: on new message, update ticket counters + notify other side
CREATE OR REPLACE FUNCTION public.on_new_support_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t RECORD; recipient uuid;
BEGIN
  SELECT * INTO t FROM public.support_tickets WHERE id = NEW.ticket_id;

  IF NEW.sender_type = 'seller' THEN
    UPDATE public.support_tickets SET
      last_message_at = NEW.created_at,
      last_message_preview = left(NEW.body, 140),
      agent_unread = agent_unread + 1,
      status = CASE WHEN status IN ('resolved','closed') THEN 'open'::public.ticket_status ELSE status END,
      updated_at = now()
    WHERE id = NEW.ticket_id;

    -- notify assigned agent (if any) — broader notification is up to UI realtime
    IF t.assigned_to IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
      VALUES (t.assigned_to, 'generic', 'Nova mensagem em chamado', left(NEW.body, 160),
              '/admin/support?t=' || t.id::text,
              jsonb_build_object('ticket_id', t.id));
    END IF;
  ELSE
    recipient := t.opened_by;
    UPDATE public.support_tickets SET
      last_message_at = NEW.created_at,
      last_message_preview = left(NEW.body, 140),
      seller_unread = seller_unread + 1,
      status = CASE WHEN status = 'open' THEN 'in_progress'::public.ticket_status ELSE status END,
      updated_at = now()
    WHERE id = NEW.ticket_id;

    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    VALUES (recipient, 'generic', 'Resposta do suporte', left(NEW.body, 160),
            '/seller/support?t=' || t.id::text,
            jsonb_build_object('ticket_id', t.id));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_on_new_support_message ON public.support_messages;
CREATE TRIGGER trg_on_new_support_message
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.on_new_support_message();

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_support_agents_updated ON public.support_agents;
CREATE TRIGGER trg_support_agents_updated BEFORE UPDATE ON public.support_agents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_support_tickets_updated ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
