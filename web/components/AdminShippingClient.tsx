"use client";

import { useState } from "react";
import type { Governorate } from "@/lib/types";

type Props = {
  initialGovernorates: Governorate[];
  initialEnabled: boolean;
  initialThreshold: string;
};

export default function AdminShippingClient({
  initialGovernorates,
  initialEnabled,
  initialThreshold,
}: Props) {
  const [rows, setRows] = useState<Governorate[]>(initialGovernorates);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [threshold, setThreshold] = useState(initialThreshold);
  const [bulkFee, setBulkFee] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function updateRow(id: number, patch: Partial<Governorate>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function applyToAll() {
    const fee = Number(bulkFee);
    if (!Number.isFinite(fee) || fee < 0 || bulkFee === "") {
      setMessage("اكتب قيمة صحيحة للشحن أولاً");
      return;
    }
    setRows((current) => current.map((row) => ({ ...row, fee })));
    setMessage(`تم تعيين ${fee} لكل المحافظات — اضغط حفظ لتأكيد التغيير`);
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/shipping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          governorates: rows.map((row) => ({
            id: row.id,
            fee: Number(row.fee),
            is_active: Boolean(row.is_active),
          })),
          free_shipping_enabled: enabled,
          free_shipping_threshold: Number(threshold) || 0,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذّر الحفظ");
      setMessage("تم حفظ الشحن بنجاح ✅");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  const activeCount = rows.filter((row) => row.is_active).length;

  return (
    <div className="container-x py-10 sm:py-14">
      <div>
        <span className="eyebrow">إدارة المتجر</span>
        <h1 className="section-title mt-4">الشحن والمحافظات</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          حدد رسوم الشحن لكل محافظة على حدة، und افتح أو اقفل أي محافظة من ظهورها للعملاء.
        </p>
      </div>

      <div className="mt-8 space-y-6">
        <div className="panel">
          <h2 className="font-display text-2xl text-[var(--brand)]">شحن مجاني</h2>
          <p className="mb-6 mt-1 text-[11px] text-[var(--muted)]">
            لو المجموع وصل للحد ده، الشحن بيبقى مجاني und مش هيضاف للطلب.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--line)] bg-white px-4">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-5 w-5 accent-[var(--brand)]"
              />
              <span className="text-xs font-bold">تفعيل الشحن المجاني</span>
            </label>
            <label>
              <span className="label">الحد (بالعملة)</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                disabled={!enabled}
                className="input no-spinner"
              />
            </label>
          </div>
        </div>

        <div className="panel">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl text-[var(--brand)]">رسوم المحافظات</h2>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {activeCount} محافظة مفعّلة من {rows.length}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label>
                <span className="label">قيمة لكل المحافظات</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={bulkFee}
                  onChange={(e) => setBulkFee(e.target.value)}
                  placeholder="مثال: 0 أو 70"
                  className="input no-spinner w-36"
                />
              </label>
              <button type="button" onClick={applyToAll} className="btn-line !min-h-12 !py-2 !text-xs">
                تطبيق على الكل
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white/70">
            <div className="hidden grid-cols-[1fr_150px_120px] gap-4 border-b border-[var(--line)] px-4 py-3 text-[11px] font-extrabold text-[var(--muted)] sm:grid">
              <span>المحافظة</span>
              <span>رسوم الشحن</span>
              <span>مفعّلة</span>
            </div>
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[1fr_92px_64px] items-center gap-3 border-b border-[var(--line)] px-4 py-3 last:border-0 sm:grid-cols-[1fr_150px_120px] sm:gap-4"
              >
                <span className="truncate text-xs font-bold">{row.name}</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={row.fee}
                  onChange={(e) => updateRow(row.id, { fee: Number(e.target.value) })}
                  className="input no-spinner !min-h-10 !px-2 !py-1 text-center"
                  aria-label={`رسوم الشحن لمحافظة ${row.name}`}
                />
                <label className="flex items-center justify-center gap-1.5 text-[10px] font-bold">
                  <input
                    type="checkbox"
                    checked={Boolean(row.is_active)}
                    onChange={(e) => updateRow(row.id, { is_active: e.target.checked })}
                    className="h-5 w-5 accent-[var(--brand)]"
                    aria-label={`تفعيل محافظة ${row.name}`}
                  />
                  <span className="hidden sm:inline">{row.is_active ? "نعم" : "لا"}</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {message ? <p className="panel !py-3 text-xs font-bold text-[var(--brand)]">{message}</p> : null}

        <button type="button" onClick={save} disabled={saving} className="btn-dark">
          {saving ? "جارٍ الحفظ…" : "حفظ كل الشحن"}
        </button>
      </div>
    </div>
  );
}
