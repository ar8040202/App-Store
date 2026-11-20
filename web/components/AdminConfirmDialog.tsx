"use client";

import { useEffect } from "react";

export default function AdminConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "حذف",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#04120e]/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-white p-6 shadow-2xl"
      >
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-xl">🗑️</span>
        <h2 className="mt-4 font-display text-2xl text-[var(--brand)]">{title}</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{body}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-[var(--line)] px-5 py-2.5 text-xs font-bold transition hover:bg-black/5 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-full bg-[var(--danger)] px-5 py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "جارٍ الحذف…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
