
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS document text,
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS category text;
