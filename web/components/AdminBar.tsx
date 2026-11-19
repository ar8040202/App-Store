"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminBar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="border-b border-white/10 bg-[#0b1f19] text-white">
      <div className="container-x flex h-16 flex-wrap items-center gap-4">
        <span className="flex items-center gap-2 font-display text-lg">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--gold)] text-sm text-[var(--brand)]">E</span>
          لوحة التحكم
        </span>
        <nav className="flex items-center gap-1 rounded-full bg-white/5 p-1">
          <Link href="/admin/orders" className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${pathname === "/admin/orders" ? "bg-[var(--gold)] text-[#1b2a20]" : "hover:bg-white/10"}`}>الطلبات</Link>
          <Link href="/admin/settings" className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${pathname === "/admin/settings" ? "bg-[var(--gold)] text-[#1b2a20]" : "hover:bg-white/10"}`}>الإعدادات</Link>
          <Link href="/admin/password" className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${pathname === "/admin/password" ? "bg-[var(--gold)] text-[#1b2a20]" : "hover:bg-white/10"}`}>كلمة المرور</Link>
        </nav>
        <div className="ms-auto flex items-center gap-3">
          <Link href="/" className="text-[11px] font-bold text-white/60 hover:text-white">عرض المتجر</Link>
          <button type="button" onClick={logout} className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] font-bold transition hover:border-[var(--gold)] hover:text-[var(--gold)]">تسجيل الخروج</button>
        </div>
      </div>
    </div>
  );
}
