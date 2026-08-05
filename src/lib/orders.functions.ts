import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeDiscount } from "@/lib/shop.functions";

const cartItem = z.object({
  product_id: z.string().uuid(),
  qty: z.number().int().positive().max(50),
});

export const FREE_DELIVERY_ABOVE = 199;
export const DELIVERY_FEE = 25;

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      items: z.array(cartItem).min(1).max(50),
      address: z.string().min(5).max(500),
      customer_lat: z.number().nullable().optional(),
      customer_lng: z.number().nullable().optional(),
      notes: z.string().max(500).optional().nullable(),
      coupon_code: z.string().max(40).nullable().optional(),
      use_wallet: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const productIds = data.items.map((i) => i.product_id);
    const { data: products, error: pErr } = await context.supabase
      .from("products")
      .select("id, name, price, is_active")
      .in("id", productIds);
    if (pErr) throw new Error(pErr.message);
    const map = new Map(products?.map((p) => [p.id, p]));
    let subtotal = 0;
    const rows = data.items.map((it) => {
      const p = map.get(it.product_id);
      if (!p || !p.is_active) throw new Error(`Product unavailable`);
      const line = Number(p.price) * it.qty;
      subtotal += line;
      return { product_id: p.id, product_name: p.name, qty: it.qty, price: Number(p.price) };
    });

    // Coupon
    let discount = 0;
    let couponCode: string | null = null;
    if (data.coupon_code) {
      const { data: coupon } = await context.supabase
        .from("coupons")
        .select("*")
        .eq("code", data.coupon_code.toUpperCase().trim())
        .eq("is_active", true)
        .maybeSingle();
      if (coupon && subtotal >= Number(coupon.min_order)) {
        discount = computeDiscount(
          {
            discount_type: coupon.discount_type,
            discount_value: Number(coupon.discount_value),
            max_discount: coupon.max_discount != null ? Number(coupon.max_discount) : null,
          },
          subtotal,
        );
        couponCode = coupon.code;
      }
    }

    const deliveryFee = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
    let total = Math.max(0, subtotal - discount + deliveryFee);

    // Wallet
    let walletUsed = 0;
    if (data.use_wallet) {
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", context.userId)
        .maybeSingle();
      const balance = Number(profile?.wallet_balance ?? 0);
      walletUsed = Math.min(balance, total);
      total -= walletUsed;
    }

    const { data: order, error: oErr } = await context.supabase
      .from("orders")
      .insert({
        customer_id: context.userId,
        subtotal,
        delivery_fee: deliveryFee,
        discount,
        coupon_code: couponCode,
        wallet_used: walletUsed,
        total,
        address: data.address,
        customer_lat: data.customer_lat ?? null,
        customer_lng: data.customer_lng ?? null,
        notes: data.notes ?? null,
      })
      .select()
      .single();
    if (oErr) throw new Error(oErr.message);

    const { error: iErr } = await context.supabase
      .from("order_items")
      .insert(rows.map((r) => ({ ...r, order_id: order.id })));
    if (iErr) throw new Error(iErr.message);

    if (walletUsed > 0 || couponCode) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      if (walletUsed > 0) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("wallet_balance")
          .eq("id", context.userId)
          .maybeSingle();
        await supabaseAdmin
          .from("profiles")
          .update({ wallet_balance: Number(profile?.wallet_balance ?? 0) - walletUsed })
          .eq("id", context.userId);
        await supabaseAdmin.from("wallet_transactions").insert({
          user_id: context.userId,
          amount: -walletUsed,
          reason: `Used on order #${order.id.slice(0, 8).toUpperCase()}`,
          order_id: order.id,
        });
      }
      if (couponCode) {
        const { data: c } = await supabaseAdmin
          .from("coupons")
          .select("used_count")
          .eq("code", couponCode)
          .maybeSingle();
        await supabaseAdmin
          .from("coupons")
          .update({ used_count: (c?.used_count ?? 0) + 1 })
          .eq("code", couponCode);
      }
    }

    if (data.customer_lat != null && data.customer_lng != null) {
      await context.supabase.from("live_locations").insert({
        order_id: order.id,
        customer_lat: data.customer_lat,
        customer_lng: data.customer_lng,
      });
    }
    return order;
  });


export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("customer_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return order;
  });

export const listAllOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAgentOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("agent_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const assignAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ order_id: z.string().uuid(), agent_id: z.string().uuid().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("orders")
      .update({ agent_id: data.agent_id, status: data.agent_id ? "accepted" : "placed" })
      .eq("id", data.order_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      order_id: z.string().uuid(),
      status: z.enum(["placed", "accepted", "picked", "out_for_delivery", "delivered", "cancelled"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.order_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertLiveLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      order_id: z.string().uuid(),
      role: z.enum(["customer", "agent"]),
      lat: z.number(),
      lng: z.number(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch = data.role === "customer"
      ? { customer_lat: data.lat, customer_lng: data.lng, updated_at: new Date().toISOString() }
      : { agent_lat: data.lat, agent_lng: data.lng, updated_at: new Date().toISOString() };
    const { error } = await context.supabase
      .from("live_locations")
      .upsert({ order_id: data.order_id, ...patch });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
