import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeDiscount } from "@/lib/pricing";

/* ---------------- Addresses ---------------- */

export const listMyAddresses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("addresses")
      .select("*")
      .eq("user_id", context.userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const addressSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1).max(40),
  full_address: z.string().min(5).max(500),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  is_default: z.boolean().default(false),
});

export const saveAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => addressSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      ...data,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      user_id: context.userId,
    };
    const { data: row, error } = await context.supabase
      .from("addresses")
      .upsert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (data.is_default) {
      await context.supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", context.userId)
        .neq("id", row.id);
    }
    return row;
  });

export const deleteAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("addresses")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Coupons ---------------- */

export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ code: z.string().min(1).max(40), subtotal: z.number().nonnegative() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: coupon } = await context.supabase
      .from("coupons")
      .select("*")
      .eq("code", data.code.toUpperCase().trim())
      .eq("is_active", true)
      .maybeSingle();
    if (!coupon) throw new Error("Invalid coupon code");
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
      throw new Error("Coupon expired");
    if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit)
      throw new Error("Coupon usage limit reached");
    if (data.subtotal < Number(coupon.min_order))
      throw new Error(`Minimum order ₹${Number(coupon.min_order).toFixed(0)} required`);
    return {
      code: coupon.code,
      description: coupon.description,
      discount: computeDiscount(
        {
          discount_type: coupon.discount_type,
          discount_value: Number(coupon.discount_value),
          max_discount: coupon.max_discount != null ? Number(coupon.max_discount) : null,
        },
        data.subtotal,
      ),
    };
  });

const couponSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(2).max(40),
  description: z.string().max(200).nullable().optional(),
  discount_type: z.enum(["percent", "flat"]),
  discount_value: z.number().nonnegative(),
  min_order: z.number().nonnegative(),
  max_discount: z.number().nonnegative().nullable().optional(),
  usage_limit: z.number().int().positive().nullable().optional(),
  is_active: z.boolean(),
});

export const upsertCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => couponSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: row, error } = await context.supabase
      .from("coupons")
      .upsert({ ...data, code: data.code.toUpperCase().trim() })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Banners ---------------- */

const bannerSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(80),
  subtitle: z.string().max(140).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  link_slug: z.string().max(80).nullable().optional(),
  sort_order: z.number().int(),
  is_active: z.boolean(),
});

export const upsertBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bannerSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: row, error } = await context.supabase
      .from("banners")
      .upsert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase.from("banners").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Wallet ---------------- */

export const getWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("wallet_balance, full_name, phone")
      .eq("id", context.userId)
      .maybeSingle();
    const { data: tx } = await context.supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(30);
    return {
      balance: Number(profile?.wallet_balance ?? 0),
      full_name: profile?.full_name ?? null,
      phone: profile?.phone ?? null,
      transactions: tx ?? [],
    };
  });
