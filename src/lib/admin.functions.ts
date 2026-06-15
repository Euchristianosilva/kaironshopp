import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function adminGate(context: any) {
  const email = (context.claims as any)?.email as string | undefined;
  const { assertAdminAccess } = await import("@/lib/admin-auth.server");
  await assertAdminAccess(context.userId, email);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/* ============================== OVERVIEW ============================== */

export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await adminGate(context);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

    const [usersRes, sellersRes, productsRes, productsInactiveRes, ordersTodayRes, ordersMonthRes, ordersPrevMonthRes] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("sellers").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("products").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("products").select("id", { count: "exact", head: true }).eq("is_active", false),
        supabaseAdmin.from("orders").select("gross_cents, platform_fee_cents", { count: "exact" }).eq("payment_status", "paid").gte("created_at", startOfDay),
        supabaseAdmin.from("orders").select("gross_cents, platform_fee_cents", { count: "exact" }).eq("payment_status", "paid").gte("created_at", startOfMonth),
        supabaseAdmin.from("orders").select("gross_cents", { count: "exact" }).eq("payment_status", "paid").gte("created_at", startOfPrevMonth).lt("created_at", startOfMonth),
      ]);

    const sumGross = (rows: any[] | null) => (rows ?? []).reduce((a, r) => a + (r.gross_cents ?? 0), 0);
    const sumFee = (rows: any[] | null) => (rows ?? []).reduce((a, r) => a + (r.platform_fee_cents ?? 0), 0);
    const grossMonth = sumGross(ordersMonthRes.data as any);
    const grossPrevMonth = sumGross(ordersPrevMonthRes.data as any);

    return {
      users: usersRes.count ?? 0,
      sellers: sellersRes.count ?? 0,
      products: productsRes.count ?? 0,
      productsInactive: productsInactiveRes.count ?? 0,
      ordersToday: ordersTodayRes.count ?? 0,
      ordersMonth: ordersMonthRes.count ?? 0,
      grossToday: sumGross(ordersTodayRes.data as any),
      grossMonth,
      feeMonth: sumFee(ordersMonthRes.data as any),
      growth: grossPrevMonth > 0 ? ((grossMonth - grossPrevMonth) / grossPrevMonth) * 100 : null,
    };
  });

/* ============================== USERS ============================== */

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string }) => d ?? {})
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await adminGate(context);
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const ids = users.map((u) => u.id);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids);
    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const list = roleMap.get((r as any).user_id) ?? [];
      list.push((r as any).role);
      roleMap.set((r as any).user_id, list);
    }
    const s = (data.search ?? "").toLowerCase();
    return users
      .map((u) => ({
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        banned_until: (u as any).banned_until ?? null,
        roles: roleMap.get(u.id) ?? [],
      }))
      .filter((u) => !s || u.email.toLowerCase().includes(s));
  });

export const setUserBanned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; banned: boolean }) => d)
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await adminGate(context);
    await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: data.banned ? "8760h" : "none" } as any);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await adminGate(context);
    await supabaseAdmin.auth.admin.deleteUser(data.userId);
    return { ok: true };
  });

/* ============================== SELLERS ============================== */

export const listSellers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await adminGate(context);
    const { data } = await supabaseAdmin
      .from("sellers")
      .select("id, name, slug, owner_id, status, stripe_onboarding_status, origin_zip, created_at")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const setSellerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sellerId: string; status: "pending" | "active" | "suspended" }) => d)
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await adminGate(context);
    const { error } = await supabaseAdmin.from("sellers").update({ status: data.status } as any).eq("id", data.sellerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================== PRODUCTS ============================== */

export const listProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string }) => d ?? {})
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await adminGate(context);
    let q = supabaseAdmin
      .from("products")
      .select("id, title, price, is_active, is_featured, seller_id, category_slug, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.search) q = q.ilike("title", `%${data.search}%`);
    const { data: rows } = await q;
    return rows ?? [];
  });

export const setProductFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string; is_active?: boolean; is_featured?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await adminGate(context);
    const patch: any = {};
    if (data.is_active !== undefined) patch.is_active = data.is_active;
    if (data.is_featured !== undefined) patch.is_featured = data.is_featured;
    const { error } = await supabaseAdmin.from("products").update(patch).eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string }) => d)
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await adminGate(context);
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================== ORDERS ============================== */

export const listOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string }) => d ?? {})
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await adminGate(context);
    let q = supabaseAdmin
      .from("orders")
      .select("id, buyer_id, seller_id, status, payment_status, fulfillment_status, total, gross_cents, shipping_cents, tracking_code, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows } = await q;
    return rows ?? [];
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await adminGate(context);
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: "canceled", payment_status: "canceled", fulfillment_status: "canceled" })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================== CATEGORIES ============================== */

export const listCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await adminGate(context);
    const { data } = await supabaseAdmin.from("categories").select("*").order("position", { ascending: true });
    return data ?? [];
  });

const CategoryInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, "Slug inválido"),
  parent_id: z.string().uuid().nullable().optional(),
  icon: z.string().max(80).nullable().optional(),
  position: z.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional(),
});

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CategoryInput.parse(d))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await adminGate(context);
    const payload: any = {
      name: data.name, slug: data.slug,
      parent_id: data.parent_id ?? null, icon: data.icon ?? null,
      position: data.position ?? 0, is_active: data.is_active ?? true,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("categories").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("categories").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await adminGate(context);
    const { error } = await supabaseAdmin.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================== BANNERS ============================== */

export const listBanners = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await adminGate(context);
    const { data } = await supabaseAdmin.from("banners").select("*").order("position", { ascending: true });
    return data ?? [];
  });

const BannerInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(120),
  subtitle: z.string().max(240).nullable().optional(),
  image_url: z.string().url(),
  link_url: z.string().url().nullable().optional(),
  position: z.number().int().min(0).max(999).optional(),
  is_active: z.boolean().optional(),
});

export const upsertBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BannerInput.parse(d))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await adminGate(context);
    const payload: any = {
      title: data.title, subtitle: data.subtitle ?? null,
      image_url: data.image_url, link_url: data.link_url ?? null,
      position: data.position ?? 0, is_active: data.is_active ?? true,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("banners").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("banners").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await adminGate(context);
    const { error } = await supabaseAdmin.from("banners").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================== COUPONS ============================== */

export const listCoupons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await adminGate(context);
    const { data } = await supabaseAdmin
      .from("coupons")
      .select("id, code, discount_type, discount_value, min_purchase_cents, max_uses, uses_count, valid_from, valid_until, active, seller_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const setCouponActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; active: boolean }) => d)
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await adminGate(context);
    const { error } = await supabaseAdmin.from("coupons").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================== SETTINGS ============================== */

export const getPlatformSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await adminGate(context);
    const { data } = await supabaseAdmin.from("platform_settings").select("*").eq("id", true).maybeSingle();
    return data;
  });

const SettingsInput = z.object({
  commission_percent: z.number().min(0).max(100),
  platform_name: z.string().min(1).max(80),
  logo_url: z.string().url().nullable().optional(),
  support_email: z.string().email().nullable().optional(),
  seo_title: z.string().max(160).nullable().optional(),
  seo_description: z.string().max(320).nullable().optional(),
});

export const updatePlatformSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SettingsInput.parse(d))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await adminGate(context);
    const { error } = await supabaseAdmin
      .from("platform_settings")
      .upsert({ id: true, ...data } as any, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================== REPORTS ============================== */

export const getReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await adminGate(context);
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id, total, gross_cents, platform_fee_cents, shipping_cents, status, payment_status, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false });
    const rows = orders ?? [];
    const paid = rows.filter((o: any) => o.payment_status === "paid");
    return {
      since,
      total_orders: rows.length,
      paid_orders: paid.length,
      gross_cents: paid.reduce((a: number, o: any) => a + (o.gross_cents ?? 0), 0),
      fee_cents: paid.reduce((a: number, o: any) => a + (o.platform_fee_cents ?? 0), 0),
      shipping_cents: paid.reduce((a: number, o: any) => a + (o.shipping_cents ?? 0), 0),
      rows: rows.slice(0, 100),
    };
  });

/* ============================== SALES SERIES (CHARTS) ============================== */

export const getAdminSalesSeries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { days?: number }) => ({ days: Math.min(Math.max(d?.days ?? 30, 1), 365) }))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await adminGate(context);
    const days = data.days;
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * days);
    since.setHours(0, 0, 0, 0);

    const [ordersRes, usersRes] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("created_at, gross_cents, platform_fee_cents, payment_status")
        .gte("created_at", since.toISOString()),
      supabaseAdmin
        .from("profiles")
        .select("created_at")
        .gte("created_at", since.toISOString()),
    ]);

    const buckets = new Map<string, { date: string; revenue: number; orders: number; users: number; fee: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { date: key, revenue: 0, orders: 0, users: 0, fee: 0 });
    }
    for (const o of (ordersRes.data ?? []) as any[]) {
      const key = String(o.created_at).slice(0, 10);
      const b = buckets.get(key);
      if (!b) continue;
      if (o.payment_status === "paid") {
        b.revenue += (o.gross_cents ?? 0) / 100;
        b.fee += (o.platform_fee_cents ?? 0) / 100;
        b.orders += 1;
      }
    }
    for (const u of (usersRes.data ?? []) as any[]) {
      const key = String(u.created_at).slice(0, 10);
      const b = buckets.get(key);
      if (b) b.users += 1;
    }
    return { days, series: Array.from(buckets.values()) };
  });
