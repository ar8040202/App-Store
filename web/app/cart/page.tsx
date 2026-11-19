import type { Metadata } from "next";
import CartView from "@/components/CartView";
import { getCatalog } from "@/lib/store";

export const metadata: Metadata = { title: "سلة التسوق" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const catalog = await getCatalog();
  return (
    <CartView
      products={catalog.products}
      governorates={catalog.governorates}
      paymentMethods={catalog.paymentMethods}
      currency={catalog.settings.store_currency || "ج.م"}
      freeShippingThreshold={Number(catalog.settings.free_shipping_threshold) || 1500}
    />
  );
}
