"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginClient({ next }: { next: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذّر تسجيل الدخول");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-74px)] lg:grid-cols-2">
      <div className="grain relative hidden overflow-hidden bg-[var(--brand)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -end-24 top-1/4 h-80 w-80 rounded-full bg-[var(--gold)]/10 blur-3xl" />
        <Link href="/" className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-[var(--gold)] font-display text-2xl text-[var(--brand)]">E</span>
          <span>
            <strong className="block font-display text-2xl">EMO STORE</strong>
            <small className="block text-[9px] tracking-[0.26em] text-white/50">ADMIN CONSOLE</small>
          </span>
        </Link>
        <div className="relative">
          <span className="eyebrow">مساحة الإدارة</span>
          <p className="display mt-5 text-4xl leading-relaxed">
            كل التفاصيل
            <br />
            <span className="text-[var(--gold)]">تحت سيطرتك.</span>
          </p>
          <p className="mt-5 max-w-sm text-sm leading-8 text-white/60">
            تابع الطلبات، حدّث حالتها، وعدّل بيانات المتجر ووسائل التواصل من مكان واحد.
          </p>
        </div>
        <p className="relative text-[11px] text-white/40">© {new Date().getFullYear()} EMO STORE</p>
      </div>

      <div className="flex items-center justify-center px-5 py-16 sm:px-10">
        <div className="w-full max-w-sm">
          <span className="eyebrow">تسجيل الدخول</span>
          <h1 className="display mt-4 text-4xl">لوحة التحكم</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">أدخل بيانات الأدمن للمتابعة.</p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label className="label" htmlFor="admin-username">اسم المستخدم</label>
              <input id="admin-username" required dir="ltr" value={username} onChange={(e) => setUsername(e.target.value)} className="input text-left" placeholder="admin" autoComplete="username" />
            </div>
            <div>
              <label className="label" htmlFor="admin-password">كلمة المرور</label>
              <input id="admin-password" required dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input text-left" placeholder="••••••••" autoComplete="current-password" />
            </div>
            {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-[var(--danger)]">{error}</p> : null}
            <button type="submit" disabled={loading} className="btn-dark w-full">
              {loading ? "جارٍ الدخول…" : "دخول"}
            </button>
          </form>

          <div className="mt-8 rounded-2xl border border-dashed border-[var(--line)] bg-white/60 px-5 py-4 text-[11px] leading-6 text-[var(--muted)]">
            هذه الصفحة مخصصة لصاحب المتجر فقط. بيانات الدخول محددة من إعدادات النشر.
          </div>

          <Link href="/" className="mt-6 flex min-h-10 items-center justify-center text-center text-xs font-bold text-[var(--brand)] underline underline-offset-4">
            العودة للمتجر
          </Link>
        </div>
      </div>
    </div>
  );
}
