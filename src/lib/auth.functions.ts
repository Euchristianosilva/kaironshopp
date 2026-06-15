import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCurrentUserAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getUserAccess } = await import("@/lib/admin-auth.server");
    const email = (context.claims as any)?.email as string | undefined;
    return getUserAccess(context.userId, email);
  });