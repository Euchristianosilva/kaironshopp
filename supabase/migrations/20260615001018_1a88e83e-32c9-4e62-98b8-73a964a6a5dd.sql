ALTER TABLE public.melhor_envio_config
  ADD COLUMN IF NOT EXISTS oauth_state TEXT,
  ADD COLUMN IF NOT EXISTS oauth_state_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;