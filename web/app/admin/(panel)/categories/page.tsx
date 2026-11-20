import type { Metadata } from "next";
import AdminCategoriesClient from "@/components/AdminCategoriesClient";
import { listAdminCategories } from "@/lib/store";

export const metadata: Metadata = { title: "إدارة الأقسام" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  return <AdminCategoriesClient initial={await listAdminCategories()} />;
}
