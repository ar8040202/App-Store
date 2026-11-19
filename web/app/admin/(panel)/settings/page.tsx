import type { Metadata } from "next";
import AdminSettingsClient from "@/components/AdminSettingsClient";
import { getSettings } from "@/lib/store";

export const metadata: Metadata = { title: "إعدادات المتجر" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  return <AdminSettingsClient initial={await getSettings()} />;
}
