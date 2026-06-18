
CREATE OR REPLACE FUNCTION public.validate_flash_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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
REVOKE EXECUTE ON FUNCTION public.validate_flash_sale() FROM PUBLIC, anon, authenticated;
