"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminConfirmDialog from "@/components/AdminConfirmDialog";
import AdminNotice from "@/components/AdminNotice";
import { AdminImageField } from "@/components/AdminImageUpload";
import { imageSrc } from "@/lib/store";
import type { Category } from "@/lib/types";

type Draft = {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  sort_order: string;
  is_active: boolean;
};

const blank: Draft = {
  name: "",
  slug: "",
  description: "",
  image_url: "",
  sort_order: "0",
  is_active: true,
};

export default function AdminCategoriesClient({ initial }: { initial: Category[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState<Draft>(blank);
  const [editing, setEditing] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [tone, setTone] = useState<"success" | "error">("success");
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      `${item.name} ${item.slug} ${item.description || ""}`.toLowerCase().includes(q),
    );
  }, [items, query]);

  const activeCount = items.filter((item) => Boolean(item.is_active)).length;

  function show(message: string, nextTone: "success" | "error" = "success") {
    setTone(nextTone);
    setNotice(message);
  }

  async function reload() {
    const response = await fetch("/api/admin/categories");
    const data = await response.json();
    if (response.ok) setItems(data.categories);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/categories", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          id: editing ?? undefined,
          sort_order: Number(draft.sort_order) || 0,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذّر الحفظ");
      await reload();
      router.refresh();
      setDraft(blank);
      setEditing(null);
      show(editing ? "تم تحديث القسم بنجاح ✅" : "تمت إضافة القسم بنجاح ✅");
    } catch (error) {
      show(error instanceof Error ? error.message : "حدث خطأ", "error");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: Category) {
    setEditing(item.id);
    setDraft({
      name: item.name,
      slug: item.slug,
      description: item.description || "",
      image_url: item.image_url || "",
      sort_order: String(item.sort_order),
      is_active: Boolean(item.is_active),
    });
  }

  function resetForm() {
    setDraft(blank);
    setEditing(null);
  }

  async function remove() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const response = await fetch("/api/admin/categories", {
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
      show("تم حذف القسم بنجاح ✅");
    } catch (error) {
      show(error instanceof Error ? error.message : "حدث خطأ", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="container-x py-10 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="eyebrow">إدارة المتجر</span>
          <h1 className="section-title mt-4">الأقسام</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            أضف قسماً جديداً أو عدّل الأقسام الحالية وترتيب ظهورها في المتجر.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-[11px] font-extrabold text-[var(--brand)]">
            {items.length} قسم
          </span>
          <span className="rounded-full border border-[#cfe8d9] bg-[#f1faf4] px-4 py-2 text-[11px] font-extrabold text-[#2f7a55]">
            {activeCount} ظاهر
          </span>
        </div>
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(300px,370px)_1fr]">
        <form onSubmit={submit} className="panel space-y-4 lg:sticky lg:top-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-[var(--brand)]">
                {editing ? "تعديل القسم" : "قسم جديد"}
              </h2>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {editing ? "عدّل البيانات ثم احفظ التغييرات." : "املأ البيانات لإضافة قسم للمتجر."}
              </p>
            </div>
            {editing ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[10px] font-bold text-[var(--muted)] transition hover:text-[var(--brand)]"
              >
                إلغاء
              </button>
            ) : null}
          </div>

          <label className="block">
            <span className="label">اسم القسم *</span>
            <input
              className="input"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="مثال: عطور"
              required
            />
          </label>
          <label className="block">
            <span className="label">
              الرابط (Slug) <span className="font-normal text-[var(--muted)]">— اختياري</span>
            </span>
            <input
              dir="ltr"
              className="input text-left"
              value={draft.slug}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              placeholder="يُولّد تلقائياً من الاسم"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">ترتيب العرض</span>
              <input
                type="number"
                min={0}
                className="input"
                value={draft.sort_order}
                onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })}
              />
            </label>
            <AdminImageField
              value={draft.image_url}
              onChange={(url) => setDraft({ ...draft, image_url: url })}
              label="صورة القسم"
            />
          </div>
          <label className="block">
            <span className="label">الوصف</span>
            <textarea
              className="input min-h-20 resize-y"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="وصف مختصر للقسم"
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--brand-soft)]/50 px-4 py-3">
            <span className="text-xs font-bold">ظاهر في المتجر</span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-[var(--brand)]"
              checked={draft.is_active}
              onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
            />
          </label>
          <button type="submit" disabled={saving} className="btn-dark w-full">
            {saving ? "جارٍ الحفظ…" : editing ? "حفظ التعديلات" : "إضافة القسم"}
          </button>
        </form>

        <section className="space-y-4">
          <div className="panel !py-4">
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث باسم القسم أو الرابط…"
            />
          </div>

          {shown.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {shown.map((item) => (
                <article key={item.id} className="panel flex items-start gap-4 transition hover:shadow-lg">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[var(--brand-soft)]">
                    <img src={imageSrc(item.image_url)} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-extrabold text-[var(--brand)]">{item.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                          Boolean(item.is_active)
                            ? "bg-[#e8f6ee] text-[#2f7a55]"
                            : "bg-black/5 text-[var(--muted)]"
                        }`}
                      >
                        {Boolean(item.is_active) ? "مفعّل" : "مخفي"}
                      </span>
                    </div>
                    <p dir="ltr" className="mt-1 text-left text-[10px] text-[var(--muted)]">
                      /{item.slug}
                    </p>
                    <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
                      {item.description || "لا يوجد وصف"}
                    </p>
                    <p className="mt-2 text-[10px] font-bold text-[var(--muted)]">
                      الترتيب: {item.sort_order}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      aria-label={`تعديل ${item.name}`}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--line)] text-xs transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(item)}
                      aria-label={`حذف ${item.name}`}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--line)] text-xs transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
                    >
                      🗑
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="panel py-16 text-center text-sm text-[var(--muted)]">
              لا توجد أقسام مطابقة.
            </div>
          )}
        </section>
      </div>

      <AdminConfirmDialog
        open={Boolean(pendingDelete)}
        title="حذف القسم؟"
        body={`هتحذف قسم «${pendingDelete?.name ?? ""}». المنتجات اللي فيه مش هتتمسح، بس هتظهر بدون قسم.`}
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
      <AdminNotice message={notice} tone={tone} onClose={() => setNotice("")} />
    </div>
  );
}
