ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_service_id text,
  ADD COLUMN IF NOT EXISTS shipping_service_name text,
  ADD COLUMN IF NOT EXISTS shipping_company text,
  ADD COLUMN IF NOT EXISTS shipping_delivery_days integer,
  ADD COLUMN IF NOT EXISTS shipping_to_zip text;