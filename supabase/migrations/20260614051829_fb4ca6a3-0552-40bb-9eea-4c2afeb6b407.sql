
-- Notifications enum
DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM (
    'new_order','payment_paid','payment_failed','order_shipped','order_delivered',
    'new_review','low_stock','payout_paid','generic'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type public.notification_type NOT NULL DEFAULT 'generic',
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Helper: notify all sellers of an order
CREATE OR REPLACE FUNCTION public.notify_sellers_new_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT s.owner_id, s.id AS seller_id
    FROM public.order_items oi
    JOIN public.sellers s ON s.id = oi.seller_id
    WHERE oi.order_id = NEW.id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    VALUES (
      r.owner_id, 'new_order',
      'Novo pedido recebido',
      'Você recebeu um novo pedido. Clique para ver os detalhes.',
      '/seller/orders',
      jsonb_build_object('order_id', NEW.id, 'seller_id', r.seller_id)
    );
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_sellers_new_order ON public.orders;
CREATE TRIGGER trg_notify_sellers_new_order
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_sellers_new_order();

-- Helper: notify on payment status change
CREATE OR REPLACE FUNCTION public.notify_sellers_payment_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; ntype public.notification_type; ntitle TEXT; nbody TEXT;
BEGIN
  IF NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status THEN RETURN NEW; END IF;

  IF NEW.payment_status = 'paid' THEN
    ntype := 'payment_paid';
    ntitle := 'Pagamento aprovado';
    nbody := 'Um pedido foi pago. Prepare o envio.';
  ELSIF NEW.payment_status = 'failed' THEN
    ntype := 'payment_failed';
    ntitle := 'Falha no pagamento';
    nbody := 'O pagamento de um pedido falhou.';
  ELSE
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT DISTINCT s.owner_id
    FROM public.order_items oi
    JOIN public.sellers s ON s.id = oi.seller_id
    WHERE oi.order_id = NEW.id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    VALUES (r.owner_id, ntype, ntitle, nbody, '/seller/orders',
            jsonb_build_object('order_id', NEW.id, 'payment_status', NEW.payment_status));
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_sellers_payment_change ON public.orders;
CREATE TRIGGER trg_notify_sellers_payment_change
AFTER UPDATE OF payment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_sellers_payment_change();

-- Notify buyer when seller updates fulfillment (shipped/delivered)
CREATE OR REPLACE FUNCTION public.notify_buyer_fulfillment_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ntype public.notification_type; ntitle TEXT; nbody TEXT;
BEGIN
  IF NEW.fulfillment_status IS NOT DISTINCT FROM OLD.fulfillment_status THEN RETURN NEW; END IF;

  IF NEW.fulfillment_status = 'shipped' THEN
    ntype := 'order_shipped'; ntitle := 'Seu pedido foi enviado';
    nbody := COALESCE('Rastreio: ' || NEW.tracking_code, 'Acompanhe a entrega na sua conta.');
  ELSIF NEW.fulfillment_status = 'delivered' THEN
    ntype := 'order_delivered'; ntitle := 'Pedido entregue';
    nbody := 'Seu pedido foi entregue. Avalie sua compra!';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
  VALUES (NEW.buyer_id, ntype, ntitle, nbody, '/account',
          jsonb_build_object('order_id', NEW.id, 'tracking_code', NEW.tracking_code));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_buyer_fulfillment_change ON public.orders;
CREATE TRIGGER trg_notify_buyer_fulfillment_change
AFTER UPDATE OF fulfillment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_buyer_fulfillment_change();
