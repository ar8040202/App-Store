import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminLoginClient from "@/components/AdminLoginClient";
import { isAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "دخول الأدمن" };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await isAdmin()) redirect("/admin/orders");
  const { next } = await searchParams;
  const target = next && next.startsWith("/admin/") ? next : "/admin/orders";
  return <AdminLoginClient next={target} />;
}
