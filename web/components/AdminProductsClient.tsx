"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminConfirmDialog from "@/components/AdminConfirmDialog";
import AdminNotice from "@/components/AdminNotice";
import { AdminGalleryField, AdminImageField } from "@/components/AdminImageUpload";
import { imageSrc, money } from "@/lib/store";
import type { Category, Product } from "@/lib/types";

type Draft = {
  id?: number;
  name: string;
  slug: string;
  category_id: string;
  price: string;
  compare_at_price: string;
  stock: string;
  image_url: string;
  gallery: string;
  sizes: string;
  colors: string;
  description: string;
  details: string;
  is_active: boolean;
  is_featured: boolean;
  rating: string;
  reviews_count: string;
};

const str = (value: unknown) => (value == null ? "" : String(value));

function draftFrom(product: Product): Draft {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category_id: product.category_id ? String(product.category_id) : "",
    price: str(product.price),
    compare_at_price: str(product.compare_at_price),
    stock: str(product.stock),
    image_url: str(product.image_url),
    gallery: str(product.gallery),
    sizes: str(product.sizes),
    colors: str(product.colors),
    description: str(product.description),
    details: str(product.details),
    is_active: Boolean(product.is_active),
    is_featured: Boolean(product.is_featured),
    rating: str(product.rating),
    reviews_count: str(product.reviews_count),
  };
}

const blank: Draft = {
  name: "",
  slug: "",
  category_id: "",
  price: "",
  compare_at_price: "",
  stock: "0",
  image_url: "",
  gallery: "",
  sizes: "",
  colors: "",
  description: "",
  details: "",
  is_active: true,
  is_featured: false,
  rating: "",
  reviews_count: "",
};

export default function AdminProductsClient({
  initialProducts,
  categories,
}: {
  initialProducts: Product[];
  categories: Category[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [products, setProducts] = useState(initialProducts);
  const [draft, setDraft] = useState<Draft>(blank);
  const [editing, setEditing] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockDrafts, setStockDrafts] = useState<Record<number, string>>({});
  const [savingStock, setSavingStock] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [tone, setTone] = useState<"success" | "error">("success");
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const categoryName = (id: number | null) =>
    categories.find((item) => item.id === id)?.name ?? "بدون قسم";

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery =
        !q || `${product.name} ${product.slug}`.toLowerCase().includes(q);
      const matchesCategory =
        categoryFilter === "all" ||
        (categoryFilter === "none"
          ? !product.category_id
          : String(product.category_id) === categoryFilter);
      return matchesQuery && matchesCategory;
    });
  }, [products, query, categoryFilter]);

  const stats = useMemo(
    () => ({
      all: products.length,
      active: products.filter((p) => Boolean(p.is_active)).length,
      out: products.filter((p) => Number(p.stock) <= 0).length,
      low: products.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 5).length,
    }),
    [products],
  );

  function show(message: string, nextTone: "success" | "error" = "success") {
    setTone(nextTone);
    setNotice(message);
  }

  async function reload() {
    const response = await fetch("/api/admin/products");
    const data = await response.json();
    if (response.ok) setProducts(data.products);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/products", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذّر الحفظ");
      await reload();
      router.refresh();
      setDraft(blank);
      setEditing(null);
      show(editing ? "تم تحديث المنتج بنجاح ✅" : "تمت إضافة المنتج بنجاح ✅");
    } catch (error) {
      show(error instanceof Error ? error.message : "حدث خطأ", "error");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(product: Product) {
    setDraft(draftFrom(product));
    setEditing(product.id);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetForm() {
    setDraft(blank);
    setEditing(null);
  }

  async function saveStock(product: Product) {
    const raw = stockDrafts[product.id] ?? str(product.stock);
    const stock = Number(raw);
    if (!Number.isInteger(stock) || stock < 0) {
      show("الكمية يجب أن تكون رقماً صحيحاً", "error");
      return;
    }
    setSavingStock(product.id);
    try {
      const response = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draftFrom(product), stock }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذّر تحديث الكمية");
      await reload();
      router.refresh();
      show(`تم تحديث كمية «${product.name}» إلى ${stock} ✅`);
    } catch (error) {
      show(error instanceof Error ? error.message : "حدث خطأ", "error");
    } finally {
      setSavingStock(null);
    }
  }

  async function remove() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const response = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pendingDelete.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذّر الحذف");
      if (editing === pendingDelete.id) resetForm();
      await reload();
      router.refresh();
      setPendingDelete(null);
      show("تم حذف المنتج بنجاح ✅");
    } catch (error) {
      show(error instanceof Error ? error.message : "حدث خطأ", "error");
    } finally {
      setDeleting(false);
    }
  }

  const set = (key: keyof Draft, value: string | boolean) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <div className="container-x py-10 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="eyebrow">إدارة المتجر</span>
          <h1 className="section-title mt-4">المنتجات والمخزون</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            أضف منتجاً، عدّل سعره وصورته، وتابع كميته المتاحة. الكمية بتنقص تلقائياً مع الطلبات وترجع لو اتلغى الطلب.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-[11px] font-extrabold text-[var(--brand)]">{stats.all} منتج</span>
          <span className="rounded-full border border-[#cfe8d9] bg-[#f1faf4] px-4 py-2 text-[11px] font-extrabold text-[#2f7a55]">{stats.active} متاح</span>
          <span className="rounded-full border border-[#f2dfb5] bg-[#fff9ec] px-4 py-2 text-[11px] font-extrabold text-[#8a6a2f]">{stats.low} كمية منخفضة</span>
          <span className="rounded-full border border-[#f2cccc] bg-[#fff3f3] px-4 py-2 text-[11px] font-extrabold text-[var(--danger)]">{stats.out} نفد</span>
        </div>
      </header>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(320px,390px)_1fr]">
        <form ref={formRef} onSubmit={submit} className="panel space-y-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-[var(--brand)]">
                {editing ? "تعديل المنتج" : "منتج جديد"}
              </h2>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {editing ? "عدّل البيانات ثم احفظ." : "املأ البيانات لإضافة منتج للمتجر."}
              </p>
            </div>
            {editing ? (
              <button type="button" onClick={resetForm} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[10px] font-bold text-[var(--muted)] transition hover:text-[var(--brand)]">
                إلغاء
              </button>
            ) : null}
          </div>

          <label className="block">
            <span className="label">اسم المنتج *</span>
            <input className="input" value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="مثال: قميص كتان" required />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">القسم</span>
              <select className="input cursor-pointer" value={draft.category_id} onChange={(e) => set("category_id", e.target.value)}>
                <option value="">بدون قسم</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">الرابط (Slug) <span className="font-normal text-[var(--muted)]">— اختياري</span></span>
              <input dir="ltr" className="input text-left" value={draft.slug} onChange={(e) => set("slug", e.target.value)} placeholder="يُولّد تلقائياً" />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">السعر (ج.م) *</span>
              <input type="number" min={0} step="0.01" className="input" value={draft.price} onChange={(e) => set("price", e.target.value)} placeholder="0.00" required />
            </label>
            <label className="block">
              <span className="label">سعر قبل الخصم</span>
              <input type="number" min={0} step="0.01" className="input" value={draft.compare_at_price} onChange={(e) => set("compare_at_price", e.target.value)} placeholder="اختياري" />
            </label>
          </div>

          <label className="block rounded-2xl border border-[var(--gold)]/50 bg-[var(--gold-soft)]/40 p-4">
            <span className="label !text-[var(--brand)]">الكمية المتاحة في المخزون *</span>
            <input type="number" min={0} step={1} className="input !bg-white" value={draft.stock} onChange={(e) => set("stock", e.target.value)} required />
            <span className="mt-2 block text-[10px] leading-5 text-[var(--muted)]">
              بتنقص تلقائياً عند كل طلب، وترجع لو اتلغى الطلب. اكتب 0 لو المنتج نفد.
            </span>
          </label>

          <AdminImageField value={draft.image_url} onChange={(url) => set("image_url", url)} />

          <label className="block">
            <span className="label">وصف المنتج</span>
            <textarea className="input min-h-24 resize-y" value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="وصف يظهر في صفحة المنتج" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">المقاسات</span>
              <input className="input" value={draft.sizes} onChange={(e) => set("sizes", e.target.value)} placeholder="S, M, L" />
            </label>
            <label className="block">
              <span className="label">الألوان</span>
              <input className="input" value={draft.colors} onChange={(e) => set("colors", e.target.value)} placeholder="أسود، بيج" />
            </label>
          </div>

          <label className="block">
            <span className="label">تفاصيل إضافية</span>
            <textarea className="input min-h-20 resize-y" value={draft.details} onChange={(e) => set("details", e.target.value)} placeholder="الخامة، القصة، العناية…" />
          </label>
          <AdminGalleryField value={draft.gallery} onChange={(urls) => set("gallery", urls)} />

          <div className="space-y-2 rounded-xl border border-[var(--line)] p-4">
            <label className="flex items-center justify-between gap-3 text-xs font-bold">
              ظاهر في المتجر
              <input type="checkbox" className="h-5 w-5 accent-[var(--brand)]" checked={draft.is_active} onChange={(e) => set("is_active", e.target.checked)} />
            </label>
            <label className="flex items-center justify-between gap-3 text-xs font-bold">
              منتج مميز
              <input type="checkbox" className="h-5 w-5 accent-[var(--brand)]" checked={draft.is_featured} onChange={(e) => set("is_featured", e.target.checked)} />
            </label>
          </div>

          <button type="submit" disabled={saving} className="btn-dark w-full">
            {saving ? "جارٍ الحفظ…" : editing ? "حفظ التعديلات" : "إضافة المنتج"}
          </button>
        </form>

        <section className="space-y-4">
          <div className="panel grid gap-3 !py-4 sm:grid-cols-2">
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن منتج…" />
            <select className="input cursor-pointer" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">كل الأقسام</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
              <option value="none">بدون قسم</option>
            </select>
          </div>

          <div className="panel overflow-hidden !p-0">
            <div className="hidden grid-cols-[minmax(200px,1fr)_130px_130px_190px_100px] gap-4 border-b border-[var(--line)] bg-[var(--brand-soft)]/40 px-5 py-3 text-[10px] font-extrabold text-[var(--muted)] lg:grid">
              <span>المنتج</span><span>القسم</span><span>السعر</span><span>الكمية (المخزون)</span><span>إجراءات</span>
            </div>

            {shown.length ? shown.map((product) => {
              const stock = Number(product.stock);
              return (
                <div key={product.id} className="grid gap-4 border-b border-[var(--line)] px-5 py-4 last:border-b-0 lg:grid-cols-[minmax(200px,1fr)_130px_130px_190px_100px] lg:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--brand-soft)]">
                      <img src={imageSrc(product.image_url)} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold text-[var(--brand)]">{product.name}</p>
                      <p dir="ltr" className="mt-0.5 truncate text-left text-[10px] text-[var(--muted)]">/{product.slug}</p>
                      {!product.is_active ? <span className="mt-1 inline-block rounded-full bg-black/5 px-2 py-0.5 text-[9px] font-bold text-[var(--muted)]">مخفي</span> : null}
                      {product.is_featured ? <span className="mt-1 inline-block rounded-full bg-[var(--gold-soft)] px-2 py-0.5 text-[9px] font-bold text-[#8a6a2f]">مميز</span> : null}
                    </div>
                  </div>

                  <div className="text-[11px] font-bold text-[var(--muted)]">
                    <span className="mb-1 inline-block text-[9px] text-[var(--muted)] lg:hidden">القسم: </span>
                    {categoryName(product.category_id)}
                  </div>
                  <div className="text-xs font-extrabold text-[var(--brand)]">
                    <span className="mb-1 inline-block text-[9px] text-[var(--muted)] lg:hidden">السعر: </span>
                    {money(product.price)}
                  </div>

                  <div>
                    <span className="mb-1 inline-block text-[9px] text-[var(--muted)] lg:hidden">الكمية: </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={stockDrafts[product.id] ?? str(product.stock)}
                        onChange={(e) => setStockDrafts((current) => ({ ...current, [product.id]: e.target.value }))}
                        className="input !w-20 !px-2 !py-1.5 text-center"
                        aria-label={`كمية ${product.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => saveStock(product)}
                        disabled={savingStock === product.id}
                        title="حفظ الكمية"
                        className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--brand)] text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                      >
                        ✓
                      </button>
                    </div>
                    <span className={`mt-1 inline-block text-[9px] font-extrabold ${
                      stock <= 0 ? "text-[var(--danger)]" : stock <= 5 ? "text-[#8a6a2f]" : "text-[#2f7a55]"
                    }`}>
                      {stock <= 0 ? "نفد من المخزون" : stock <= 5 ? `كمية منخفضة (${stock})` : `متوفر (${stock})`}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit(product)} aria-label={`تعديل ${product.name}`} className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--line)] text-xs transition hover:border-[var(--brand)] hover:text-[var(--brand)]">✎</button>
                    <button type="button" onClick={() => setPendingDelete(product)} aria-label={`حذف ${product.name}`} className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--line)] text-xs transition hover:border-[var(--danger)] hover:text-[var(--danger)]">🗑</button>
                  </div>
                </div>
              );
            }) : (
              <div className="py-16 text-center text-sm text-[var(--muted)]">لا توجد منتجات مطابقة.</div>
            )}
          </div>
        </section>
      </div>

      <AdminConfirmDialog
        open={Boolean(pendingDelete)}
        title="حذف المنتج؟"
        body={`هتحذف «${pendingDelete?.name ?? ""}» نهائياً من المتجر. سجل الطلبات القديمة مش هيتأثر.`}
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
      <AdminNotice message={notice} tone={tone} onClose={() => setNotice("")} />
    </div>
  );
}
