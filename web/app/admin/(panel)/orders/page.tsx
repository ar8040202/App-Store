import type { Metadata } from "next";
import AdminOrdersClient from "@/components/AdminOrdersClient";
import { getCatalog, listOrders } from "@/lib/store";

export const metadata: Metadata = { title: "إدارة الطلبات" };
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const [orders, catalog] = await Promise.all([listOrders(), getCatalog()]);
  return (
    <AdminOrdersClient
      initialOrders={orders}
      currency={catalog.settings.store_currency || "ج.م"}
    />
  );
}
