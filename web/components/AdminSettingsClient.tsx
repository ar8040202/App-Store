"use client";

import { useState } from "react";
import type { Settings } from "@/lib/types";

type Field = {
  key: string;
  label: string;
  dir?: string;
  multiline?: boolean;
  rows?: number;
  hint?: string;
};

const GROUPS: { title: string; hint: string; fields: Field[] }[] = [
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
  {
    title: "الشريط المتحرك",
    hint: "النصوص اللي بتتحرك في شريط الصفحة الرئيسية. سيب الخانة فاضية لإخفاء الشريط.",
    fields: [
      {
        key: "marquee_items",
        label: "عبارات الشريط",
        multiline: true,
        rows: 5,
        hint: "اكتب عبارة في كل سطر — هتظهر مسبوقة بـ ✦",
      },
    ],
  },
  {
    title: "مميزات المتجر",
    hint: "العناصر الأربعة اللي بتظهر تحت الشريط المتحرك. تقدر تضيف أو تشيل أو تعدّل أي عنصر.",
    fields: [
      {
        key: "trust_items",
        label: "عناصر المميزات",
        multiline: true,
        rows: 5,
        hint: "كل سطر: العنوان | الوصف — سيب الخانة فاضية لإخفاء القسم",
      },
    ],
  },
  {
    title: "الفوتر",
    hint: "عدّل عناوين الأعمدة والروابط والنصوص اللي بتظهر في آخر الصفحة.",
    fields: [
      { key: "footer_about", label: "نبذة المتجر", multiline: true, rows: 3 },
      { key: "footer_shop_title", label: "عنوان عمود التسوّق" },
      {
        key: "footer_shop_links",
        label: "روابط التسوّق",
        multiline: true,
        rows: 5,
        hint: "كل سطر: العنوان | الرابط",
      },
      { key: "footer_support_title", label: "عنوان عمود خدمة العملاء" },
      {
        key: "footer_support_links",
        label: "روابط خدمة العملاء",
        multiline: true,
        rows: 5,
        hint: "كل سطر: العنوان | الرابط — وتقدر تستخدم {phone} و {email}",
      },
      { key: "footer_contact_title", label: "عنوان عمود التواصل" },
      {
        key: "footer_payment_badges",
        label: "وسائل الدفع",
        multiline: true,
        rows: 4,
        hint: "وسيلة في كل سطر",
      },
      {
        key: "footer_copyright",
        label: "حقوق النشر",
        hint: "{year} و {store} بيتعوضوا تلقائياً",
      },
      { key: "footer_credit", label: "النص الأخير" },
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
        <p className="mt-2 text-sm text-[var(--muted)]">
          عدّل بيانات المتجر والشريط المتحرك والفوتر من مكان واحد.
        </p>
      </div>

      <form onSubmit={save} className="mt-8 space-y-6">
        {GROUPS.map((group) => (
          <div key={group.title} className="panel">
            <h2 className="font-display text-2xl text-[var(--brand)]">{group.title}</h2>
            <p className="mb-6 mt-1 text-[11px] text-[var(--muted)]">{group.hint}</p>
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {group.fields.map((field) => (
                <label
                  key={field.key}
                  className={field.multiline ? "sm:col-span-2" : undefined}
                >
                  <span className="label">{field.label}</span>
                  {field.multiline ? (
                    <textarea
                      dir={field.dir}
                      rows={field.rows ?? 4}
                      value={values[field.key] ?? ""}
                      onChange={(e) =>
                        setValues((current) => ({ ...current, [field.key]: e.target.value }))
                      }
                      className={`input resize-y ${field.dir === "ltr" ? "text-left" : ""}`}
                    />
                  ) : (
                    <input
                      dir={field.dir}
                      value={values[field.key] ?? ""}
                      onChange={(e) =>
                        setValues((current) => ({ ...current, [field.key]: e.target.value }))
                      }
                      className={`input ${field.dir === "ltr" ? "text-left" : ""}`}
                    />
                  )}
                  {field.hint ? (
                    <span className="mt-1.5 block text-[10px] text-[var(--muted)]">
                      {field.hint}
                    </span>
                  ) : null}
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
