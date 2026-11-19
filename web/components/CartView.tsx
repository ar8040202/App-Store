"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { imageSrc, money } from "@/lib/store";
import { PAYMENT_LABELS } from "@/lib/constants";
import type { Governorate, PaymentMethod, Product } from "@/lib/types";

type Props = {
  products: Product[];
  governorates: Governorate[];
  paymentMethods: PaymentMethod[];
  currency: string;
  freeShippingThreshold: number;
};

export default function CartView({
  products,
  governorates,
  paymentMethods,
  currency,
  freeShippingThreshold,
}: Props) {
  const { items, setQuantity, remove, clear } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [governorate, setGovernorate] = useState(governorates[0]?.name || "");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState(paymentMethods[0]?.code || "cod");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  const lines = useMemo(
    () =>
      Object.entries(items)
        .map(([id, quantity]) => {
          const product = products.find((p) => p.id === Number(id));
          return product ? { product, quantity } : null;
        })
        .filter((line): line is { product: Product; quantity: number } => line !== null),
    [items, products],
  );

  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const shipping = subtotal >= freeShippingThreshold ? 0 : (governorates.find((g) => g.name === governorate)?.fee ?? 0);
  const total = subtotal + shipping;
  const remaining = Math.max(0, freeShippingThreshold - subtotal);

  async function submitOrder(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name,
          customer_phone: phone,
          governorate,
          city,
          address,
          notes,
          payment_method: payment,
          items: lines.map((line) => ({
            product_id: line.product.id,
            quantity: line.quantity,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذّر إنشاء الطلب");
      setOrderNumber(data.order.order_number);
      clear();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  if (orderNumber) {
    return (
      <div className="container-x py-16 sm:py-24">
        <div className="panel mx-auto max-w-2xl p-10 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 13 4 4L19 7" />
            </svg>
          </span>
          <h1 className="display mt-6 text-3xl sm:text-4xl">تم تأكيد طلبك ✅</h1>
          <p className="mt-3 text-sm text-[var(--muted)]">رقم الطلب الخاص بك — احتفظ بيه عشان تتتبعه في أي وقت.</p>
          <div className="mx-auto mt-7 max-w-sm rounded-2xl border border-dashed border-[var(--gold)] bg-[var(--gold-soft)]/50 px-6 py-5">
            <span className="block text-[11px] font-bold text-[#7a622f]">رقم الطلب</span>
            <strong className="display mt-1 block text-2xl tracking-wide text-[var(--brand)]" dir="ltr">{orderNumber}</strong>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={`/track?order=${encodeURIComponent(orderNumber)}`} className="btn-dark">تتبع الطلب</Link>
            <Link href="/shop" className="btn-line">متابعة التسوق</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="container-x py-16 sm:py-24">
        <div className="panel py-20 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--brand-soft)] text-3xl text-[var(--brand)]">🛍️</span>
          <h1 className="display mt-6 text-3xl">سلتك فاضية</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">ابدأ بتصفّح التشكيلة واختار اللي يعجبك.</p>
          <Link href="/shop" className="btn-dark mt-7">تصفّح المنتجات</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-12 sm:py-16">
      <div className="mb-10">
        <span className="eyebrow">خطوة واحدة للانتهاء</span>
        <h1 className="section-title mt-4">سلة التسوق</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        {/* ITEMS */}
        <div className="space-y-4">
          {lines.map(({ product, quantity }) => (
            <div key={product.id} className="panel flex flex-wrap items-center gap-4 !p-4">
              <Link href="/shop" className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-[#ece6da]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageSrc(product.image_url)} alt={product.name} className="h-full w-full object-cover" />
              </Link>
              <div className="min-w-[140px] flex-1">
                <h3 className="text-sm font-extrabold">{product.name}</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">{product.category?.name || "عام"}</p>
                <p className="mt-2 text-sm font-extrabold text-[var(--brand)]">{money(product.price, currency)}</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-[var(--line)] p-1">
                <button type="button" onClick={() => setQuantity(product.id, quantity - 1, product.stock)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--gold-soft)]" aria-label="تقليل">−</button>
                <span className="no-spinner w-8 text-center text-sm font-extrabold">{quantity}</span>
                <button type="button" onClick={() => setQuantity(product.id, quantity + 1, product.stock)} disabled={quantity >= product.stock} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--gold-soft)] disabled:opacity-40" aria-label="زيادة">+</button>
              </div>
              <p className="w-20 text-left text-sm font-extrabold">{money(product.price * quantity, currency)}</p>
              <button type="button" onClick={() => remove(product.id)} className="text-[var(--danger)] hover:underline" aria-label="حذف">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
              </button>
            </div>
          ))}

          <div className="rounded-[20px] border border-dashed border-[var(--gold)] bg-[var(--gold-soft)]/40 px-5 py-4 text-xs font-bold text-[#6b5427]">
            {remaining > 0
              ? `أضف قطع بقيمة ${money(remaining, currency)} واحصل على شحن مجاني 🎁`
              : "🎊 حصلت على شحن مجاني!"}
          </div>
        </div>

        {/* CHECKOUT */}
        <form onSubmit={submitOrder} className="panel h-fit lg:sticky lg:top-24">
          <h2 className="font-display text-2xl">بيانات الطلب</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">الاسم الكامل *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="مثال: أحمد محمد" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">رقم الهاتف *</label>
              <input required dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} className="input text-left" placeholder="01012345678" />
            </div>
            <div>
              <label className="label">المحافظة *</label>
              <select required value={governorate} onChange={(e) => setGovernorate(e.target.value)} className="input cursor-pointer">
                {governorates.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">المدينة *</label>
              <input required value={city} onChange={(e) => setCity(e.target.value)} className="input" placeholder="المدينة" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">العنوان بالتفصيل *</label>
              <textarea required rows={2} value={address} onChange={(e) => setAddress(e.target.value)} className="input resize-none" placeholder="الشارع، رقم المبنى، علامة مميزة" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">ملاحظات (اختياري)</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="input resize-none" placeholder="أي تفاصيل تساعدنا في التوصيل" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">طريقة الدفع *</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {paymentMethods.map((method) => (
                  <label key={method.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold transition ${payment === method.code ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]" : "border-[var(--line)]"}`}>
                    <input type="radio" name="payment" value={method.code} checked={payment === method.code} onChange={() => setPayment(method.code)} className="accent-[var(--brand)]" />
                    {PAYMENT_LABELS[method.code] || method.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2 border-t border-[var(--line)] pt-5 text-sm">
            <div className="flex justify-between text-[var(--muted)]"><span>المجموع الفرعي</span><span>{money(subtotal, currency)}</span></div>
            <div className="flex justify-between text-[var(--muted)]"><span>الشحن</span><span className={shipping === 0 ? "font-bold text-[#2f7a55]" : ""}>{shipping === 0 ? "مجاني" : money(shipping, currency)}</span></div>
            <div className="flex justify-between border-t border-[var(--line)] pt-3 text-base font-extrabold"><span>الإجمالي</span><span className="text-[var(--brand)]">{money(total, currency)}</span></div>
          </div>

          {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-[var(--danger)]">{error}</p> : null}

          <button type="submit" disabled={loading} className="btn-dark mt-6 w-full">
            {loading ? "جارٍ تأكيد الطلب…" : "تأكيد الطلب"}
          </button>
          <p className="mt-3 text-center text-[10px] text-[var(--muted)]">بالتأكيد أنت توافق على سياسة الشحن والاسترجاع</p>
        </form>
      </div>
    </div>
  );
}
