"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import type { Category, Product } from "@/lib/types";

type Props = {
  products: Product[];
  categories: Category[];
  currency: string;
};

export default function ShopClient({ products, categories, currency }: Props) {
  const searchParams = useSearchParams();
  const initialSlug = searchParams.get("category") || "all";
  const [category, setCategory] = useState(initialSlug);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("featured");

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    const result = products.filter((product) => {
      const matchesCategory =
        category === "all" || product.category?.slug === category;
      const matchesQuery =
        !term ||
        product.name.toLowerCase().includes(term) ||
        (product.category?.name || "").includes(term);
      return matchesCategory && matchesQuery;
    });

    if (sort === "price-asc") return [...result].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") return [...result].sort((a, b) => b.price - a.price);
    if (sort === "rating") return [...result].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return [...result].sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.id - b.id);
  }, [products, category, query, sort]);

  return (
    <div className="container-x py-12 sm:py-16">
      <div className="mb-10">
        <span className="eyebrow">مجموعة EMO</span>
        <h1 className="section-title mt-4">كل القطع في مكان واحد</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {products.length} قطعة مختارة بعناية — تصفّح، ابحث، واختار ما يناسبك.
        </p>
      </div>

      <div className="panel mb-10 !p-4 sm:!p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <svg className="absolute end-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث عن منتج أو قسم…"
              className="input !pe-11"
            />
          </label>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="input !w-auto min-w-[170px] cursor-pointer">
            <option value="featured">الترتيب: المختارة</option>
            <option value="price-asc">السعر: من الأقل</option>
            <option value="price-desc">السعر: من الأعلى</option>
            <option value="rating">الأعلى تقييمًا</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setCategory("all")} className={`chip ${category === "all" ? "chip-active" : ""}`}>
            كل المنتجات
          </button>
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.slug)}
              className={`chip ${category === item.slug ? "chip-active" : ""}`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs font-bold text-[var(--muted)]">عرض {shown.length} من {products.length} قطعة</p>
        {(query || category !== "all") ? (
          <button
            type="button"
            onClick={() => { setQuery(""); setCategory("all"); }}
            className="text-xs font-extrabold text-[var(--brand)] underline underline-offset-4"
          >
            مسح الفلاتر
          </button>
        ) : null}
      </div>

      {shown.length ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-7">
          {shown.map((product) => (
            <ProductCard key={product.id} product={product} currency={currency} />
          ))}
        </div>
      ) : (
        <div className="panel py-20 text-center">
          <p className="text-lg font-extrabold">ما لقينا منتجات مطابقة</p>
          <p className="mt-2 text-sm text-[var(--muted)]">جرّب كلمة تانية أو اختار قسم تاني.</p>
        </div>
      )}
    </div>
  );
}
