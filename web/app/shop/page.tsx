import { Suspense } from "react";
import type { Metadata } from "next";
import ShopClient from "@/components/ShopClient";
import { getCatalog } from "@/lib/store";

export const metadata: Metadata = { title: "المتجر" };
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const catalog = await getCatalog();
  return (
    <Suspense fallback={<div className="container-x py-20 text-center text-sm text-[var(--muted)]">جارٍ تحميل المنتجات…</div>}>
      <ShopClient
        products={catalog.products}
        categories={catalog.categories}
        currency={catalog.settings.store_currency || "ج.م"}
      />
    </Suspense>
  );
}
