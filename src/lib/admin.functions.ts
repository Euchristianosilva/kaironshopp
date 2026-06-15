import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Acesso negado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

    const [
      usersRes,
      sellersRes,
      productsRes,
      productsInactiveRes,
      ordersTodayRes,
      ordersMonthRes,
      ordersPrevMonthRes,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("sellers").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("products").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("products").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin
        .from("orders")
        .select("gross_cents, platform_fee_cents", { count: "exact" })
        .eq("payment_status", "paid")
        .gte("created_at", startOfDay),
      supabaseAdmin
        .from("orders")
        .select("gross_cents, platform_fee_cents", { count: "exact" })
        .eq("payment_status", "paid")
        .gte("created_at", startOfMonth),
      supabaseAdmin
        .from("orders")
        .select("gross_cents", { count: "exact" })
        .eq("payment_status", "paid")
        .gte("created_at", startOfPrevMonth)
        .lt("created_at", startOfMonth),
    ]);

    const sumGross = (rows: any[] | null) => (rows ?? []).reduce((a, r) => a + (r.gross_cents ?? 0), 0);
    const sumFee = (rows: any[] | null) => (rows ?? []).reduce((a, r) => a + (r.platform_fee_cents ?? 0), 0);

    const grossToday = sumGross(ordersTodayRes.data as any);
    const grossMonth = sumGross(ordersMonthRes.data as any);
    const feeMonth = sumFee(ordersMonthRes.data as any);
    const grossPrevMonth = sumGross(ordersPrevMonthRes.data as any);
    const growth = grossPrevMonth > 0 ? ((grossMonth - grossPrevMonth) / grossPrevMonth) * 100 : null;

    return {
      users: usersRes.count ?? 0,
      sellers: sellersRes.count ?? 0,
      sellersPending: sellersPendingRes.count ?? 0,
      products: productsRes.count ?? 0,
      productsPending: productsPendingRes.count ?? 0,
      ordersToday: ordersTodayRes.count ?? 0,
      ordersMonth: ordersMonthRes.count ?? 0,
      grossToday,
      grossMonth,
      feeMonth,
      growth,
    };
  });
