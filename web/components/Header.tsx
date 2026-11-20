"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";

type Props = {
  storeName: string;
  storeNameEn: string;
};

const LINKS = [
  { href: "/", label: "الرئيسية" },
  { href: "/shop", label: "المتجر" },
  { href: "/track", label: "تتبع طلبك" },
  { href: "/cart", label: "السلة" },
];

export default function Header({ storeName, storeNameEn }: Props) {
  const pathname = usePathname();
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[#f6f3ec]/85 backdrop-blur-xl">
        <div className="container-x flex h-[74px] items-center gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-[var(--brand)] font-display text-xl text-[var(--gold)] shadow-lg shadow-[#0e3327]/20">
              E
            </span>
            <span className="leading-tight">
              <strong className="block font-display text-[21px] text-[var(--brand)]">
                {storeName}
              </strong>
              <small className="block text-[8px] font-extrabold tracking-[0.28em] text-[var(--muted)]">
                {storeNameEn}
              </small>
            </span>
          </Link>

          <nav className="mx-auto hidden items-center gap-1 rounded-full border border-[var(--line)] bg-white/70 p-1 md:flex">
            {LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-4 py-2 text-[13px] font-bold transition-all ${
                    active
                      ? "bg-[var(--brand)] text-white shadow-md"
                      : "text-[var(--ink)] hover:bg-[var(--gold-soft)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="ms-auto flex items-center gap-2">
            <Link
              href="/cart"
              className="flex items-center gap-2 rounded-full bg-[var(--gold-soft)] px-4 py-2.5 text-xs font-extrabold text-[#4b3a17] transition hover:bg-[var(--gold)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span className="hidden sm:inline">السلة</span>
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--brand)] px-1 text-[10px] text-white">
                {count}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-label="القائمة"
              className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] bg-white md:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <nav className="border-t border-[var(--line)] bg-white px-5 py-3 md:hidden">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-[var(--gold-soft)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
    </>
  );
}
