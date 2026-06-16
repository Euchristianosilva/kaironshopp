CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id UUID, _conv_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.conversations c
      LEFT JOIN public.sellers s ON s.id = c.seller_id
      WHERE c.id = _conv_id
        AND (c.buyer_id = _user_id OR s.owner_id = _user_id)
    )
  END
$$;

GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(UUID, UUID) FROM anon, PUBLIC;

DROP TRIGGER IF EXISTS messages_after_insert ON public.messages;
CREATE TRIGGER messages_after_insert
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.on_new_message();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;