"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { money } from "@/lib/store";
import { ORDER_STEPS, PAYMENT_LABELS, statusLabel } from "@/lib/constants";
import type { Order } from "@/lib/types";

export default function TrackClient({ currency }: { currency: string }) {
  const searchParams = useSearchParams();
  const [number, setNumber] = useState(searchParams.get("order") || "");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setOrder(null);
    setLoading(true);
    try {
      const response = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, phone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذّر العثور على الطلب");
      setOrder(data.order as Order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  const currentIndex = order ? ORDER_STEPS.indexOf(order.status as (typeof ORDER_STEPS)[number]) : -1;

  return (
    <div className="container-x py-12 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <span className="eyebrow">اطمئن على طلبك</span>
        <h1 className="section-title mt-4">تتبع طلبك</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">أدخل رقم الطلب ورقم الهاتف اللي طلبت بيه، وهتلاقي كل التفاصيل هنا.</p>
      </div>

      <form onSubmit={search} className="panel mx-auto mt-9 max-w-2xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="track-order">رقم الطلب</label>
            <input id="track-order" required dir="ltr" value={number} onChange={(e) => setNumber(e.target.value)} className="input text-left" placeholder="EMO-XXXXXXXX" />
          </div>
          <div>
            <label className="label" htmlFor="track-phone">رقم الهاتف</label>
            <input id="track-phone" required dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} className="input text-left" placeholder="01012345678" />
          </div>
        </div>
        {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-[var(--danger)]">{error}</p> : null}
        <button type="submit" disabled={loading} className="btn-dark mt-5 w-full sm:w-auto">
          {loading ? "جارٍ البحث…" : "اعرض حالة الطلب"}
        </button>
      </form>

      {order ? (
        <div className="panel mx-auto mt-8 max-w-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-5">
            <div>
              <span className="text-[11px] font-bold text-[var(--muted)]">رقم الطلب</span>
              <strong className="display block text-xl text-[var(--brand)]" dir="ltr">{order.order_number}</strong>
            </div>
            <span className={`rounded-full px-4 py-2 text-xs font-extrabold ${order.status === "cancelled" ? "bg-red-50 text-[var(--danger)]" : "bg-[var(--brand-soft)] text-[var(--brand)]"}`}>
              {statusLabel(order.status)}
            </span>
          </div>

          {order.status === "cancelled" ? (
            <div className="mt-5 rounded-2xl bg-red-50 px-5 py-4 text-sm font-bold text-[var(--danger)]">
              تم إلغاء هذا الطلب، وتم إرجاع الكميات إلى المخزون.
            </div>
          ) : (
            <div className="mt-7 space-y-0">
              {ORDER_STEPS.map((step, index) => {
                const done = index <= currentIndex;
                const active = index === currentIndex;
                return (
                  <div key={step} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className={`step-dot ${done ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)]"} ${active ? "ring-4 ring-[var(--gold-soft)]" : ""}`}>
                        {done ? "✓" : index + 1}
                      </span>
                      {index < ORDER_STEPS.length - 1 ? <span className={`h-10 w-px ${index < currentIndex ? "bg-[var(--brand)]" : "bg-[var(--line)]"}`} /> : null}
                    </div>
                    <div className="pb-8 pt-1.5">
                      <strong className={`text-sm ${done ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>{statusLabel(step)}</strong>
                      {active ? <span className="mt-1 block text-[11px] text-[var(--brand)]">طلبك في هذه المرحلة حاليًا</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid gap-6 border-t border-[var(--line)] pt-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-xs font-extrabold tracking-wide text-[var(--muted)]">ملخص الطلب</h3>
              {order.items?.map((item) => (
                <div key={item.product_id} className="mb-2 flex justify-between gap-3 text-xs">
                  <span>{item.product_name} × {item.quantity}</span>
                  <span className="font-bold">{money(item.line_total, currency)}</span>
                </div>
              ))}
              <div className="mt-3 flex justify-between border-t border-[var(--line)] pt-3 text-sm font-extrabold">
                <span>الإجمالي</span><span className="text-[var(--brand)]">{money(order.total, currency)}</span>
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-xs font-extrabold tracking-wide text-[var(--muted)]">بيانات التوصيل</h3>
              <p className="text-xs leading-7 text-[var(--ink)]">
                {order.customer_name}<br />
                {order.governorate} / {order.city}<br />
                {order.address}<br />
                <span dir="ltr" className="inline-block">{order.customer_phone}</span>
              </p>
              <p className="mt-3 text-xs text-[var(--muted)]">الدفع: {PAYMENT_LABELS[order.payment_method] || order.payment_method}</p>
            </div>
          </div>
        </div>
      ) : null}

      <p className="mt-8 text-center text-xs text-[var(--muted)]">
        محتاج مساعدة؟ <a href="https://wa.me/201000000000" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center font-extrabold text-[var(--brand)] underline underline-offset-4">تواصل معنا</a>{" "}
        أو <Link href="/shop" className="inline-flex min-h-10 items-center font-extrabold text-[var(--brand)] underline underline-offset-4">تصفّح المتجر</Link>
      </p>
    </div>
  );
}
