CREATE TABLE public.shipping_diagnostics (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  last_error_status INT,
  last_error_endpoint TEXT,
  last_error_body TEXT,
  last_request_payload JSONB,
  last_env TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shipping_diagnostics TO authenticated;
GRANT ALL ON public.shipping_diagnostics TO service_role;

ALTER TABLE public.shipping_diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view shipping diagnostics"
  ON public.shipping_diagnostics FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.shipping_diagnostics (id) VALUES (true) ON CONFLICT DO NOTHING;