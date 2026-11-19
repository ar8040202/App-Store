"use client";

import { useMemo, useState } from "react";
import { money } from "@/lib/store";
import { ORDER_STATUS_LABELS, PAYMENT_LABELS, statusLabel } from "@/lib/constants";
import type { Order } from "@/lib/types";

export default function AdminOrdersClient({
  initialOrders,
  currency,
}: {
  initialOrders: Order[];
  currency: string;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<number | null>(initialOrders[0]?.id ?? null);
  const [drafts, setDrafts] = useState<Record<number, string>>(
    Object.fromEntries(initialOrders.map((order) => [order.id, order.status])),
  );
  const [saving, setSaving] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const shown = useMemo(
    () => (filter === "all" ? orders : orders.filter((order) => order.status === filter)),
    [orders, filter],
  );

  async function save(order: Order) {
    setSaving(order.id);
    setMessage("");
    try {
      const status = drafts[order.id];
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذّر التحديث");
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? { ...item, status, stock_restored: status === "cancelled" ? true : item.stock_restored }
            : item,
        ),
      );
      setMessage(
        status === "cancelled"
          ? `تم إلغاء الطلب #${order.order_number} وإرجاع الكميات للمخزون ✅`
          : `تم تحديث حالة الطلب #${order.order_number} ✅`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ");
    } finally {
      setSaving(null);
    }
  }

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: orders.length };
    for (const order of orders) result[order.status] = (result[order.status] || 0) + 1;
    return result;
  }, [orders]);

  return (
    <div className="container-x py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">إدارة المتجر</span>
          <h1 className="section-title mt-4">الطلبات</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">راجع الطلبات وغيّر حالتها. إلغاء أي طلب يرجّع الكميات للمخزون تلقائيًا.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setFilter("all")} className={`chip ${filter === "all" ? "chip-active" : ""}`}>الكل ({counts.all})</button>
          {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setFilter(key)} className={`chip ${filter === key ? "chip-active" : ""}`}>
              {label} ({counts[key] || 0})
            </button>
          ))}
        </div>
      </div>

      {message ? <p className="panel mt-6 !py-3 text-xs font-bold text-[var(--brand)]">{message}</p> : null}

      <div className="mt-8 space-y-4">
        {shown.length ? shown.map((order) => {
          const open = expanded === order.id;
          return (
            <div key={order.id} className="panel !p-0">
              <button
                type="button"
                onClick={() => setExpanded(open ? null : order.id)}
                className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-right"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">📦</span>
                <span className="min-w-[140px] flex-1">
                  <strong className="block text-sm" dir="ltr">#{order.order_number}</strong>
                  <span className="block text-[11px] text-[var(--muted)]">{order.customer_name} · {order.governorate}</span>
                </span>
                <span className="text-xs font-extrabold text-[var(--brand)]">{money(order.total, currency)}</span>
                <span className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${order.status === "cancelled" ? "bg-red-50 text-[var(--danger)]" : "bg-[var(--gold-soft)] text-[#6b5427]"}`}>
                  {statusLabel(order.status)}
                </span>
                <span className="text-xs text-[var(--muted)]">{new Date(order.created_at).toLocaleDateString("ar-EG")}</span>
                <svg className={`transition ${open ? "rotate-180" : ""}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
              </button>

              {open ? (
                <div className="border-t border-[var(--line)] px-5 py-5">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h3 className="mb-3 text-[11px] font-extrabold text-[var(--muted)]">المنتجات</h3>
                      {order.items?.map((item) => (
                        <div key={item.product_id} className="mb-2 flex justify-between gap-3 text-xs">
                          <span>{item.product_name} × {item.quantity}</span>
                          <span className="font-bold">{money(item.line_total, currency)}</span>
                        </div>
                      ))}
                      <div className="mt-3 flex justify-between border-t border-[var(--line)] pt-3 text-sm font-extrabold">
                        <span>الإجمالي (شامل الشحن)</span><span className="text-[var(--brand)]">{money(order.total, currency)}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-3 text-[11px] font-extrabold text-[var(--muted)]">بيانات العميل</h3>
                      <p className="text-xs leading-7">
                        {order.customer_name}<br />
                        <span dir="ltr" className="inline-block">{order.customer_phone}</span><br />
                        {order.governorate} / {order.city} / {order.address}
                      </p>
                      <p className="mt-2 text-xs text-[var(--muted)]">الدفع: {PAYMENT_LABELS[order.payment_method] || order.payment_method}</p>
                      {order.notes ? <p className="mt-2 rounded-lg bg-[var(--gold-soft)]/60 px-3 py-2 text-[11px]">ملاحظة: {order.notes}</p> : null}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-end gap-3 border-t border-[var(--line)] pt-5">
                    <div className="min-w-[190px] flex-1">
                      <label className="label">تغيير الحالة</label>
                      <select
                        value={drafts[order.id] ?? order.status}
                        onChange={(e) => setDrafts((current) => ({ ...current, [order.id]: e.target.value }))}
                        className="input cursor-pointer"
                      >
                        {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <button type="button" onClick={() => save(order)} disabled={saving === order.id} className="btn-dark !py-3 !text-xs">
                      {saving === order.id ? "جارٍ الحفظ…" : "حفظ الحالة"}
                    </button>
                    {order.status === "cancelled" && order.stock_restored ? <span className="text-[11px] font-bold text-[#2f7a55]">✓ الكميات مرجّعة للمخزون</span> : null}
                  </div>
                </div>
              ) : null}
            </div>
          );
        }) : (
          <div className="panel py-16 text-center text-sm text-[var(--muted)]">لا توجد طلبات في هذا التصنيف.</div>
        )}
      </div>
    </div>
  );
}
