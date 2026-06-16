ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_label_url text,
  ADD COLUMN IF NOT EXISTS shipping_method text,
  ADD COLUMN IF NOT EXISTS package_weight_grams integer;