import type { Metadata } from "next";
import AdminPasswordClient from "@/components/AdminPasswordClient";

export const metadata: Metadata = { title: "تغيير كلمة المرور" };
export const dynamic = "force-dynamic";

export default function AdminPasswordPage() {
  return <AdminPasswordClient />;
}
