"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPasswordClient() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setFailed(false);
    try {
      const response = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next, confirm }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذّر تغيير كلمة المرور");
      setCurrent("");
      setNext("");
      setConfirm("");
      setMessage("تم تغيير كلمة المرور بنجاح ✅ استخدمها عند الدخول القادم.");
      router.refresh();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-x py-10 sm:py-14">
      <div>
        <span className="eyebrow">إدارة المتجر</span>
        <h1 className="section-title mt-4">تغيير كلمة المرور</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          حدّث كلمة مرور الدخول للوحة التحكم. استخدم كلمة قوية وفريدة لا تستخدمها في مواقع أخرى.
        </p>
      </div>

      <form onSubmit={save} className="panel mt-8 max-w-xl space-y-5">
        <label className="block">
          <span className="label">كلمة المرور الحالية</span>
          <input
            type="password"
            dir="ltr"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="input text-left"
            required
          />
        </label>
        <label className="block">
          <span className="label">كلمة المرور الجديدة</span>
          <input
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="input text-left"
            minLength={8}
            required
          />
        </label>
        <label className="block">
          <span className="label">تأكيد كلمة المرور الجديدة</span>
          <input
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input text-left"
            minLength={8}
            required
          />
        </label>

        {message ? (
          <p className={`text-xs font-bold ${failed ? "text-red-600" : "text-[var(--brand)]"}`}>
            {message}
          </p>
        ) : null}

        <button type="submit" disabled={saving} className="btn-dark">
          {saving ? "جارٍ الحفظ…" : "تحديث كلمة المرور"}
        </button>
      </form>
    </div>
  );
}
