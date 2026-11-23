import type { Governorate } from "@/lib/types";

type ShippingOptions = {
  governorates: Governorate[];
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
  defaultShippingFee?: number;
};

/** مصدر واحد لحساب الشحن في السلة und عند إنشاء الطلب عشان المبلغ يطابق دايماً. */
export function shippingFeeFor(
  subtotal: number,
  governorateName: string,
  options: ShippingOptions,
): number {
  if (
    options.freeShippingEnabled &&
    options.freeShippingThreshold > 0 &&
    subtotal >= options.freeShippingThreshold
  ) {
    return 0;
  }
  const governorate = options.governorates.find((item) => item.name === governorateName);
  if (governorate) return Number(governorate.fee) || 0;
  return Number(options.defaultShippingFee) || 0;
}
