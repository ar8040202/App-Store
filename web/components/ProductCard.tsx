"use client";

import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { imageSrc, money } from "@/lib/store";
import type { Product } from "@/lib/types";

export default function ProductCard({
  product,
  currency,
}: {
  product: Product;
  currency: string;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const soldOut = product.stock <= 0;
  const image = imageSrc(product.image_url);
  const category = product.category?.name || "قطعة مختارة";

  function handleAdd() {
    if (soldOut) return;
    add(product.id, product.stock);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  }

  return (
    <article className="group flex min-w-0 flex-col">
      <div className="product-media relative aspect-[3/4] overflow-hidden rounded-[22px] bg-[#ece6da]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={product.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />

        <div className="absolute start-3 top-3 flex flex-col gap-1.5">
          {product.is_featured ? (
            <span className="rounded-full bg-[var(--brand)] px-3 py-1.5 text-[10px] font-extrabold text-white">الأكثرطلبًا</span>
          ) : (
            <span className="rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-extrabold text-[var(--brand)]">جديد</span>
          )}
          {product.compare_at_price && product.compare_at_price > product.price ? (
            <span className="w-fit rounded-full bg-[var(--gold)] px-3 py-1.5 text-[10px] font-extrabold text-[#2b210e]">خصم</span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={soldOut}
          aria-label={`أضف ${product.name} للسلة`}
          className={`absolute bottom-3 start-3 grid h-11 w-11 place-items-center rounded-full shadow-lg transition-all duration-300 ${
            added
              ? "scale-110 bg-[var(--gold)] text-[#2b210e]"
              : "bg-white/95 text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white"
          } disabled:opacity-50`}
        >
          {added ? (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 13 4 4L19 7" />
            </svg>
          ) : (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          )}
        </button>
      </div>

      <div className="px-1 pt-4">
        <p className="text-[10px] font-extrabold tracking-[0.1em] text-[var(--muted)]">{category}</p>
        <h3 className="mt-1 line-clamp-1 text-sm font-extrabold text-[var(--ink)] sm:text-[15px]">{product.name}</h3>
        <div className="mt-1.5 flex items-center gap-1 text-[var(--gold)]">
          <span className="text-xs tracking-tight">★★★★★</span>
          <span className="text-[10px] font-semibold text-[var(--muted)]">
            ({product.reviews_count ?? 0})
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <span className="text-[15px] font-extrabold text-[var(--brand)]">
            {money(product.price, currency)}
          </span>
          {product.compare_at_price && product.compare_at_price > product.price ? (
            <span className="text-xs text-[var(--muted)] line-through">
              {money(product.compare_at_price, currency)}
            </span>
          ) : null}
        </div>
        <p className={`mt-1 text-[10px] font-bold ${soldOut ? "text-[var(--danger)]" : "text-[#3e7a5d]"}`}>
          {soldOut ? "نفد المخزون" : `متوفر · ${product.stock} قطعة`}
        </p>
      </div>
    </article>
  );
}
