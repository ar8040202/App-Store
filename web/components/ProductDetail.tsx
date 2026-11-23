"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { imageSrc, money } from "@/lib/store";
import { parseColors, parseGallery, parseStringList } from "@/lib/product-details";
import type { Product } from "@/lib/types";

export default function ProductDetail({ product, currency }: { product: Product; currency: string }) {
  const { items, setQuantity } = useCart();
  const gallery = parseGallery(product.gallery).map(imageSrc);
  const images = [...new Set([imageSrc(product.image_url), ...gallery])].filter(Boolean);
  const sizes = parseStringList(product.sizes);
  const colors = parseColors(product.colors);

  const [activeImage, setActiveImage] = useState(images[0] || imageSrc(null));
  const [selectedSize, setSelectedSize] = useState(sizes[0] || "");
  const [selectedColor, setSelectedColor] = useState(colors[0]?.name || "");
  const [quantity, setQuantityState] = useState(1);
  const [added, setAdded] = useState(false);

  const soldOut = Number(product.stock) <= 0;
  const currentInCart = items[product.id] ?? 0;
  const maxQty = Math.max(1, Number(product.stock));
  const details = parseStringList(product.details);
  const rating = Math.round(Number(product.rating) || 0);

  function changeQuantity(next: number) {
    setQuantityState(Math.min(maxQty, Math.max(1, next)));
  }

  function addToCart() {
    if (soldOut) return;
    setQuantity(product.id, currentInCart + quantity, product.stock);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="container-x py-10 sm:py-16">
      <nav className="mb-8 flex flex-wrap items-center gap-2 text-[11px] font-bold text-[var(--muted)]">
        <Link href="/" className="hover:text-[var(--brand)]">الرئيسية</Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-[var(--brand)]">المتجر</Link>
        {product.category ? (
          <>
            <span>/</span>
            <Link href={`/shop?category=${encodeURIComponent(product.category.slug)}`} className="hover:text-[var(--brand)]">
              {product.category.name}
            </Link>
          </>
        ) : null}
        <span>/</span>
        <span className="text-[var(--brand)]">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* الصور */}
        <div>
          <div className="arch overflow-hidden rounded-[24px] bg-[#ece6da] sm:rounded-[28px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activeImage} alt={product.name} className="aspect-[4/5] h-full w-full object-cover" />
          </div>
          {images.length > 1 ? (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {images.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() => setActiveImage(url)}
                  aria-label={`عرض الصورة ${index + 1}`}
                  className={`h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    activeImage === url ? "border-[var(--brand)]" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* التفاصيل */}
        <div>
          {product.category ? (
            <Link href={`/shop?category=${encodeURIComponent(product.category.slug)}`} className="eyebrow !text-[var(--brand)]">
              {product.category.name}
            </Link>
          ) : (
            <span className="eyebrow !text-[var(--brand)]">قطعة مختارة</span>
          )}

          <h1 className="display mt-4 text-3xl leading-tight sm:text-5xl">{product.name}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1 text-[var(--gold)]">
              <span className="text-sm tracking-tight">{"★".repeat(Math.min(5, rating))}{"☆".repeat(Math.max(0, 5 - rating))}</span>
              <span className="text-[11px] font-bold text-[var(--muted)]">{product.rating ?? 0} / 5</span>
            </div>
            <span className="text-[11px] font-bold text-[var(--muted)]">({product.reviews_count ?? 0} تقييم)</span>
          </div>

          <div className="mt-6 flex flex-wrap items-baseline gap-3">
            <strong className="display text-3xl text-[var(--brand)] sm:text-4xl">{money(product.price, currency)}</strong>
            {product.compare_at_price && product.compare_at_price > product.price ? (
              <span className="text-base text-[var(--muted)] line-through">{money(product.compare_at_price, currency)}</span>
            ) : null}
          </div>

          <p className={`mt-3 text-xs font-extrabold ${soldOut ? "text-[var(--danger)]" : "text-[#2f7a55]"}`}>
            {soldOut ? "نفد المخزون حالياً" : `متوفر · ${product.stock} قطعة`}
          </p>

          {product.description ? (
            <p className="mt-6 text-sm leading-8 text-[var(--muted)]">{product.description}</p>
          ) : null}

          {sizes.length ? (
            <div className="mt-8">
              <span className="label">المقاس</span>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`min-h-10 rounded-xl border px-4 text-xs font-extrabold transition ${
                      selectedSize === size
                        ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                        : "border-[var(--line)] bg-white hover:border-[var(--brand)]"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {colors.length ? (
            <div className="mt-6">
              <span className="label">اللون {selectedColor ? `— ${selectedColor}` : ""}</span>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setSelectedColor(color.name)}
                    aria-label={color.name}
                    title={color.name}
                    className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition ${
                      selectedColor === color.name ? "border-[var(--brand)] bg-[var(--brand-soft)]" : "border-[var(--line)] bg-white"
                    }`}
                  >
                    <span
                      className="h-5 w-5 rounded-full border border-black/10"
                      style={{ backgroundColor: color.hex || "#e5dfd2" }}
                    />
                    {color.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="panel mt-8 !p-4 sm:!p-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1 rounded-full border border-[var(--line)] p-1">
                <button type="button" onClick={() => changeQuantity(quantity - 1)} disabled={quantity <= 1} className="grid h-10 w-10 place-items-center rounded-full hover:bg-[var(--gold-soft)] disabled:opacity-40" aria-label="تقليل الكمية">−</button>
                <span className="w-9 text-center text-sm font-extrabold">{quantity}</span>
                <button type="button" onClick={() => changeQuantity(quantity + 1)} disabled={quantity >= maxQty} className="grid h-10 w-10 place-items-center rounded-full hover:bg-[var(--gold-soft)] disabled:opacity-40" aria-label="زيادة الكمية">+</button>
              </div>
              <button
                type="button"
                onClick={addToCart}
                disabled={soldOut}
                className={`btn-dark flex-1 ${added ? "!bg-[var(--gold)] !text-[var(--brand)]" : ""}`}
              >
                {soldOut ? "غير متوفر" : added ? "تمت الإضافة للسلة ✓" : "أضف للسلة"}
              </button>
            </div>
            {currentInCart ? (
              <Link href="/cart" className="mt-3 block text-center text-xs font-bold text-[var(--brand)] underline underline-offset-4">
                لديك {currentInCart} قطعة في السلة — اذهب للسلة
              </Link>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {["شحن لكل المحافظات", "دفع عند الاستلام", "استرجاع خلال 14 يوم"].map((label) => (
              <div key={label} className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white/60 px-3 py-3 text-[11px] font-bold">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">✓</span>
                {label}
              </div>
            ))}
          </div>

          {details.length ? (
            <div className="mt-10 border-t border-[var(--line)] pt-7">
              <h2 className="font-display text-2xl text-[var(--brand)]">تفاصيل المنتج</h2>
              <ul className="mt-4 space-y-2">
                {details.map((line, index) => (
                  <li key={`${line}-${index}`} className="flex gap-3 text-sm leading-7 text-[var(--muted)]">
                    <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gold)]" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
