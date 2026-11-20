"use client";

import { useEffect, useRef } from "react";

export default function AdminNotice({
  message,
  tone = "success",
  onClose,
}: {
  message: string;
  tone?: "success" | "error";
  onClose?: () => void;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!message || !onClose) return;
    const timer = window.setTimeout(() => closeRef.current?.(), 5000);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const success = tone === "success";
  return (
    <div
      role="status"
      className="fixed bottom-6 start-6 z-[60] flex max-w-sm items-start gap-3 rounded-2xl border border-white/10 bg-[#0b1f19] px-4 py-3 text-xs font-bold text-white shadow-2xl"
    >
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] ${
          success ? "bg-[var(--gold)] text-[var(--brand)]" : "bg-red-500 text-white"
        }`}
      >
        {success ? "✓" : "!"}
      </span>
      <span className="leading-6">{message}</span>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="ms-1 text-white/50 transition hover:text-white"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
