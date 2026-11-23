"use client";

import { useRef, useState } from "react";
import { imageSrc } from "@/lib/store";

async function send(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/admin/upload", { method: "POST", body: form });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "تعذّر رفع الصورة");
  return data.url as string;
}

const dropClass =
  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--line)] bg-[var(--brand-soft)]/30 px-4 py-6 text-center transition hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]/60";

export function AdminImageField({
  value,
  onChange,
  label = "صورة المنتج",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  async function handle(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      onChange(await send(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر رفع الصورة");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <span className="label">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        className={dropClass + (dragging ? " !border-[var(--brand)] bg-[var(--gold-soft)]/50" : "")}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <span className="text-2xl">{uploading ? "⏳" : "📷"}</span>
        <span className="text-xs font-extrabold text-[var(--brand)]">
          {uploading ? "جارٍ رفع الصورة…" : "اسحب الصورة هنا أو اضغط لاختيارها"}
        </span>
        <span className="text-[10px] text-[var(--muted)]">JPG, PNG, WebP — حتى 4 ميجابايت</span>
      </div>

      {value ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--line)] bg-white p-2">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--brand-soft)]">
            <img src={imageSrc(value)} alt="معاينة الصورة" className="h-full w-full object-cover" />
          </div>
          <span className="flex-1 truncate text-[10px] font-bold text-[var(--success)]">✓ تم رفع الصورة</span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[10px] font-bold text-[var(--muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
          >
            إزالة
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-[10px] font-bold text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}

export function AdminGalleryField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const urls = value.split(",").map((item) => item.trim()).filter(Boolean);

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) uploaded.push(await send(file));
      onChange([...urls, ...uploaded].join(","));
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر رفع الصور");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <span className="label">معرض الصور</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
      <div
        className={dropClass}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <span className="text-2xl">{uploading ? "⏳" : "🖼️"}</span>
        <span className="text-xs font-extrabold text-[var(--brand)]">
          {uploading ? "جارٍ رفع الصور…" : "ارفع صوراً إضافية للمنتج"}
        </span>
        <span className="text-[10px] text-[var(--muted)]">تقدر تختار أكتر من صورة في مرة</span>
      </div>

      {urls.length ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {urls.map((url, index) => (
            <div key={`${url}-${index}`} className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--line)]">
              <img src={imageSrc(url)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(urls.filter((_, i) => i !== index).join(","))}
                className="absolute inset-0 grid place-items-center bg-black/50 text-lg text-white opacity-0 transition group-hover:opacity-100"
                aria-label="إزالة الصورة"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-[10px] font-bold text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
