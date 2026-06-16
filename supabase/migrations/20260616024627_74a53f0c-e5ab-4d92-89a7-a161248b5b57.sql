DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can mark messages read" ON public.messages;

CREATE POLICY "Participants can view messages" ON public.messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      LEFT JOIN public.sellers s ON s.id = c.seller_id
      WHERE c.id = messages.conversation_id
        AND (c.buyer_id = auth.uid() OR s.owner_id = auth.uid())
    )
  );

CREATE POLICY "Participants can send messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      LEFT JOIN public.sellers s ON s.id = c.seller_id
      WHERE c.id = messages.conversation_id
        AND (c.buyer_id = auth.uid() OR s.owner_id = auth.uid())
    )
  );

CREATE POLICY "Participants can mark messages read" ON public.messages
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      LEFT JOIN public.sellers s ON s.id = c.seller_id
      WHERE c.id = messages.conversation_id
        AND (c.buyer_id = auth.uid() OR s.owner_id = auth.uid())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      LEFT JOIN public.sellers s ON s.id = c.seller_id
      WHERE c.id = messages.conversation_id
        AND (c.buyer_id = auth.uid() OR s.owner_id = auth.uid())
    )
  );

REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(UUID, UUID) FROM authenticated, anon, PUBLIC;