import type { Metadata } from "next";
import AdminProductsClient from "@/components/AdminProductsClient";
import { listAdminCategories, listAdminProducts } from "@/lib/store";

export const metadata: Metadata = { title: "إدارة المنتجات" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([
    listAdminProducts(),
    listAdminCategories(),
  ]);
  return (
    <AdminProductsClient initialProducts={products} categories={categories} />
  );
}
