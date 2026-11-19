import { redirect } from "next/navigation";
import AdminBar from "@/components/AdminBar";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  return (
    <>
      <AdminBar />
      {children}
    </>
  );
}
