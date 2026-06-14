
CREATE OR REPLACE FUNCTION public.increment_ad_metric(
  _campaign_id uuid,
  _date date,
  _impressions integer DEFAULT 0,
  _clicks integer DEFAULT 0
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ad_metrics (campaign_id, date, impressions, clicks)
  VALUES (_campaign_id, _date, _impressions, _clicks)
  ON CONFLICT (campaign_id, date) DO UPDATE
    SET impressions = ad_metrics.impressions + EXCLUDED.impressions,
        clicks      = ad_metrics.clicks + EXCLUDED.clicks,
        updated_at  = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_ad_metric(uuid, date, integer, integer) TO service_role;
