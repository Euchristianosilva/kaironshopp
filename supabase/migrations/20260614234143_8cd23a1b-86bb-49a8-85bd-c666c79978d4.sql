CREATE TABLE public.melhor_envio_config (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','production')),
  client_id TEXT,
  client_secret TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  callback_url TEXT,
  webhook_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

GRANT ALL ON public.melhor_envio_config TO service_role;

ALTER TABLE public.melhor_envio_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read me config"
  ON public.melhor_envio_config FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.melhor_envio_config (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TRIGGER trg_melhor_envio_config_updated
  BEFORE UPDATE ON public.melhor_envio_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();