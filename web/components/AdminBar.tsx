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
    <div className="border-b border-white/10 bg-[#16233d] text-white">
      <div className="container-x flex flex-wrap items-center gap-x-4 gap-y-2 py-3 sm:min-h-16 sm:py-0">
        <span className="flex items-center gap-2 font-display text-lg">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--gold)] text-sm text-[var(--brand)]">E</span>
          لوحة التحكم
        </span>
        <nav className="flex w-full flex-wrap items-center gap-1 rounded-2xl bg-white/5 p-1 sm:ms-4 sm:w-auto sm:flex-nowrap sm:rounded-full">
          {[
            { href: "/admin/orders", label: "الطلبات" },
            { href: "/admin/products", label: "المنتجات" },
            { href: "/admin/categories", label: "الأقسام" },
            { href: "/admin/settings", label: "الإعدادات" },
            { href: "/admin/password", label: "كلمة المرور" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex min-h-10 items-center rounded-full px-3 py-2 text-xs font-bold transition sm:px-4 sm:py-1.5 ${
                pathname === link.href ? "bg-[var(--gold)] text-[#1b2a20]" : "hover:bg-white/10"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex w-full items-center gap-3 sm:ms-auto sm:w-auto">
          <Link href="/" className="flex min-h-10 items-center px-1 text-xs font-bold text-white/60 hover:text-white">عرض المتجر</Link>
          <button type="button" onClick={logout} className="flex min-h-10 items-center rounded-full border border-white/20 px-4 py-1.5 text-xs font-bold transition hover:border-[var(--gold)] hover:text-[var(--gold)]">تسجيل الخروج</button>
        </div>
      </div>
    </div>
  );
}
