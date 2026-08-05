export const FREE_DELIVERY_ABOVE = 199;
export const DELIVERY_FEE = 25;

export function computeDiscount(
  coupon: { discount_type: string; discount_value: number; max_discount: number | null },
  subtotal: number,
) {
  const raw =
    coupon.discount_type === "flat"
      ? Number(coupon.discount_value)
      : (subtotal * Number(coupon.discount_value)) / 100;
  const capped = coupon.max_discount != null ? Math.min(raw, Number(coupon.max_discount)) : raw;
  return Math.max(0, Math.min(Math.round(capped * 100) / 100, subtotal));
}
