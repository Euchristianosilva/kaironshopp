import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/hooks/ad-scheduler')({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const now = new Date().toISOString();

        // Activate scheduled campaigns whose start time has arrived
        const { data: activated, error: actErr } = await supabaseAdmin
          .from('ad_campaigns')
          .update({ status: 'active' })
          .eq('status', 'scheduled')
          .lte('starts_at', now)
          .gt('ends_at', now)
          .select('id');

        if (actErr) {
          return new Response(JSON.stringify({ error: actErr.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // End campaigns whose end time has passed
        const { data: ended, error: endErr } = await supabaseAdmin
          .from('ad_campaigns')
          .update({ status: 'ended' })
          .in('status', ['active', 'scheduled'])
          .lte('ends_at', now)
          .select('id');

        if (endErr) {
          return new Response(JSON.stringify({ error: endErr.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            activated: activated?.length ?? 0,
            ended: ended?.length ?? 0,
            timestamp: now,
          }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      },
    },
  },
});
