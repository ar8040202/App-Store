"use client";

import { useState } from "react";
import type { Settings } from "@/lib/types";

const GROUPS: { title: string; hint: string; fields: { key: string; label: string; dir?: string }[] }[] = [
  {
    title: "هوية المتجر",
    hint: "الاسم والوصف اللي هيظهروا في الهيدر والفوتر.",
    fields: [
      { key: "store_name", label: "اسم المتجر" },
      { key: "store_name_en", label: "الاسم بالإنجليزية" },
      { key: "store_tagline", label: "الشعار / الوصف" },
      { key: "store_currency", label: "العملة" },
    ],
  },
  {
    title: "بيانات التواصل",
    hint: "تظهر في الفوتر وصفحة تتبع الطلب.",
    fields: [
      { key: "contact_phone", label: "رقم الهاتف", dir: "ltr" },
      { key: "contact_email", label: "البريد الإلكتروني", dir: "ltr" },
      { key: "whatsapp_number", label: "رقم واتساب", dir: "ltr" },
      { key: "store_address", label: "العنوان" },
      { key: "working_hours", label: "ساعات العمل" },
    ],
  },
  {
    title: "وسائل التواصل",
    hint: "روابط الحسابات الرسمية.",
    fields: [
      { key: "instagram_url", label: "رابط إنستجرام", dir: "ltr" },
      { key: "facebook_url", label: "رابط فيسبوك", dir: "ltr" },
    ],
  },
  {
    title: "طرق الدفع",
    hint: "بيانات التحويل للعملاء.",
    fields: [
      { key: "instapay_handle", label: "حساب إنستاباي", dir: "ltr" },
      { key: "wallet_number", label: "رقم المحفظة", dir: "ltr" },
    ],
  },
];

export default function AdminSettingsClient({ initial }: { initial: Settings }) {
  const [values, setValues] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: values }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذّر الحفظ");
      setMessage("تم حفظ الإعدادات بنجاح ✅");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-x py-10 sm:py-14">
      <div>
        <span className="eyebrow">إدارة المتجر</span>
        <h1 className="section-title mt-4">إعدادات المتجر</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">عدّل بيانات المتجر ووسائل التواصل والدفع من مكان واحد.</p>
      </div>

      <form onSubmit={save} className="mt-8 space-y-6">
        {GROUPS.map((group) => (
          <div key={group.title} className="panel">
            <h2 className="font-display text-2xl text-[var(--brand)]">{group.title}</h2>
            <p className="mb-6 mt-1 text-[11px] text-[var(--muted)]">{group.hint}</p>
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {group.fields.map((field) => (
                <label key={field.key}>
                  <span className="label">{field.label}</span>
                  <input
                    dir={field.dir}
                    value={values[field.key] ?? ""}
                    onChange={(e) => setValues((current) => ({ ...current, [field.key]: e.target.value }))}
                    className={`input ${field.dir === "ltr" ? "text-left" : ""}`}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}

        {message ? <p className="panel !py-3 text-xs font-bold text-[var(--brand)]">{message}</p> : null}

        <button type="submit" disabled={saving} className="btn-dark">
          {saving ? "جارٍ الحفظ…" : "حفظ كل الإعدادات"}
        </button>
      </form>
    </div>
  );
}
