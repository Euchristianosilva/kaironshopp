
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS flash_sale_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flash_sale_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS flash_sale_start timestamptz,
  ADD COLUMN IF NOT EXISTS flash_sale_end timestamptz;

CREATE INDEX IF NOT EXISTS idx_products_flash_sale_active
  ON public.products (flash_sale_end)
  WHERE flash_sale_enabled = true;

CREATE OR REPLACE FUNCTION public.validate_flash_sale()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.flash_sale_enabled THEN
    IF NEW.flash_sale_price IS NULL OR NEW.flash_sale_start IS NULL OR NEW.flash_sale_end IS NULL THEN
      RAISE EXCEPTION 'Oferta relâmpago requer preço promocional, data de início e data de término';
    END IF;
    IF NEW.flash_sale_price >= NEW.price THEN
      RAISE EXCEPTION 'O preço promocional deve ser menor que o preço normal';
    END IF;
    IF NEW.flash_sale_price <= 0 THEN
      RAISE EXCEPTION 'O preço promocional deve ser maior que zero';
    END IF;
    IF NEW.flash_sale_end <= NEW.flash_sale_start THEN
      RAISE EXCEPTION 'A data de término deve ser posterior à data de início';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_flash_sale ON public.products;
CREATE TRIGGER trg_validate_flash_sale
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.validate_flash_sale();
