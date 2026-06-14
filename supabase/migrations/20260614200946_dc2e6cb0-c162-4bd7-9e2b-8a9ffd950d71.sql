
-- Enums
CREATE TYPE public.ad_placement AS ENUM ('card', 'carousel');
CREATE TYPE public.ad_campaign_status AS ENUM (
  'pending_payment', 'scheduled', 'active', 'ended', 'canceled', 'refunded', 'rejected'
);

-- 1) ad_pricing
CREATE TABLE public.ad_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement public.ad_placement NOT NULL UNIQUE,
  price_per_hour_cents INTEGER NOT NULL CHECK (price_per_hour_cents >= 0),
  price_per_day_cents INTEGER NOT NULL CHECK (price_per_day_cents >= 0),
  price_per_week_cents INTEGER NOT NULL CHECK (price_per_week_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'brl',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ad_pricing TO authenticated;
GRANT SELECT ON public.ad_pricing TO anon;
GRANT ALL ON public.ad_pricing TO service_role;

ALTER TABLE public.ad_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_pricing read all" ON public.ad_pricing
  FOR SELECT USING (true);
CREATE POLICY "ad_pricing admin write" ON public.ad_pricing
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ad_pricing_set_updated_at
  BEFORE UPDATE ON public.ad_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed
INSERT INTO public.ad_pricing (placement, price_per_hour_cents, price_per_day_cents, price_per_week_cents)
VALUES
  ('card', 84, 2000, 14000),
  ('carousel', 1042, 8333, 58333);

-- 2) ad_campaigns
CREATE TABLE public.ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  placement public.ad_placement NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'brl',
  status public.ad_campaign_status NOT NULL DEFAULT 'pending_payment',
  priority INTEGER NOT NULL DEFAULT 0,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_refund_id TEXT,
  paid_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ad_campaigns_dates_valid CHECK (ends_at > starts_at)
);

CREATE INDEX ad_campaigns_active_lookup_idx
  ON public.ad_campaigns (placement, status, starts_at, ends_at);
CREATE INDEX ad_campaigns_product_idx ON public.ad_campaigns (product_id);
CREATE INDEX ad_campaigns_owner_idx ON public.ad_campaigns (owner_id);
CREATE INDEX ad_campaigns_seller_idx ON public.ad_campaigns (seller_id);
CREATE UNIQUE INDEX ad_campaigns_stripe_session_uniq
  ON public.ad_campaigns (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.ad_campaigns TO authenticated;
GRANT ALL ON public.ad_campaigns TO service_role;

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_campaigns owner select" ON public.ad_campaigns
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ad_campaigns owner insert" ON public.ad_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "ad_campaigns admin update" ON public.ad_campaigns
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ad_campaigns_set_updated_at
  BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) ad_metrics
CREATE TABLE public.ad_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, date)
);

CREATE INDEX ad_metrics_campaign_idx ON public.ad_metrics (campaign_id, date DESC);

GRANT SELECT ON public.ad_metrics TO authenticated;
GRANT ALL ON public.ad_metrics TO service_role;

ALTER TABLE public.ad_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_metrics owner select" ON public.ad_metrics
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.ad_campaigns c
      WHERE c.id = ad_metrics.campaign_id AND c.owner_id = auth.uid()
    )
  );

CREATE TRIGGER ad_metrics_set_updated_at
  BEFORE UPDATE ON public.ad_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
