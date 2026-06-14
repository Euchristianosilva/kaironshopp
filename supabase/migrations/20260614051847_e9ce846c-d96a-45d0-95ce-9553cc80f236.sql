
REVOKE EXECUTE ON FUNCTION public.notify_sellers_new_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_sellers_payment_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_buyer_fulfillment_change() FROM PUBLIC, anon, authenticated;
