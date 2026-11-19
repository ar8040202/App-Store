export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "جديد",
  confirmed: "مؤكد",
  preparing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

export const ORDER_STEPS = [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
] as const;

export const PAYMENT_LABELS: Record<string, string> = {
  cod: "الدفع عند الاستلام",
  instapay: "إنستاباي",
  wallet: "محفظة إلكترونية",
  visa: "بطاقة بنكية",
};

export function statusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}
