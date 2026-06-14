
-- ============== SELLERS: campos Stripe Connect ==============
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS stripe_account_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_status text NOT NULL DEFAULT 'pending'
    CHECK (stripe_onboarding_status IN ('pending','restricted','active'));

-- ============== PLATFORM SETTINGS (singleton) ==============
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  commission_percent numeric(5,2) NOT NULL DEFAULT 10.00 CHECK (commission_percent >= 0 AND commission_percent <= 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO authenticated, anon;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_settings readable by all" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "platform_settings admin write" ON public.platform_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.platform_settings (id, commission_percent) VALUES (true, 10.00) ON CONFLICT DO NOTHING;

-- ============== ORDERS: campos Stripe ==============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_session_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','failed','refunded','canceled')),
  ADD COLUMN IF NOT EXISTS gross_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL;

-- ============== ORDER_ITEMS: split por item ==============
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS gross_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_net_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id text;

-- ============== STRIPE_EVENTS (idempotência) ==============
CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id text PRIMARY KEY,
  type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.stripe_events TO service_role;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stripe_events admin read" ON public.stripe_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ============== PAYOUTS (espelho dos saques) ==============
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL,
  stripe_payout_id text NOT NULL UNIQUE,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'brl',
  arrival_date timestamptz,
  status text NOT NULL DEFAULT 'paid',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts seller read own" ON public.payouts FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = payouts.seller_id AND s.owner_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  );

-- ============== ORDERS / ORDER_ITEMS: políticas de admin ==============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='orders admin read') THEN
    CREATE POLICY "orders admin read" ON public.orders FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_items' AND policyname='order_items admin read') THEN
    CREATE POLICY "order_items admin read" ON public.order_items FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_items' AND policyname='order_items seller read') THEN
    CREATE POLICY "order_items seller read" ON public.order_items FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = order_items.seller_id AND s.owner_id = auth.uid()));
  END IF;
END $$;

-- Trigger updated_at em platform_settings
DROP TRIGGER IF EXISTS trg_platform_settings_updated ON public.platform_settings;
CREATE TRIGGER trg_platform_settings_updated BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
