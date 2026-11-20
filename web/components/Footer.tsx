import Link from "next/link";
import type { ReactNode } from "react";
import { contentLines, contentLinks, fillPlaceholders } from "@/lib/site-content";
import type { Settings } from "@/lib/types";

function cleanLink(value: string | undefined, prefix: string): string {
  const trimmed = (value || "").trim();
  if (!trimmed || trimmed === "#") return "#";
  return trimmed.startsWith("http") ? trimmed : `${prefix}${trimmed.replace(/^\+/, "")}`;
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  const className = "mb-3 block text-[13px] text-[#94a49a] hover:text-[var(--gold)]";
  if (href.startsWith("/")) {
    return <Link href={href} className={className}>{children}</Link>;
  }
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      className={className}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

export default function Footer({ settings }: { settings: Settings }) {
  const phone = settings.contact_phone || "+20 100 000 0000";
  const email = settings.contact_email || "hello@emo.store";
  const whatsapp = settings.whatsapp_number || phone;
  const tokens = {
    year: String(new Date().getFullYear()),
    store: settings.store_name || "EMO STORE",
    phone,
    email,
  };

  const about = (settings.footer_about || "").trim();
  const shopLinks = contentLinks(settings.footer_shop_links);
  const supportLinks = contentLinks(settings.footer_support_links).map((link) => ({
    ...link,
    href: fillPlaceholders(link.href, tokens),
  }));
  const badges = contentLines(settings.footer_payment_badges);
  const copyright = (settings.footer_copyright || "").trim();
  const credit = (settings.footer_credit || "").trim();

  return (
    <footer className="mt-10 bg-[#0b1f19] text-[#cfd8d1]">
      <div className="container-x py-16 sm:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-[var(--gold)] font-display text-2xl text-[#0b1f19]">
                E
              </span>
              <span>
                <strong className="block font-display text-2xl text-[#f7f2e7]">
                  {settings.store_name || "EMO STORE"}
                </strong>
                <small className="block text-[9px] font-extrabold tracking-[0.26em] text-[#7b8c81]">
                  {settings.store_name_en || "EMO STORE"}
                </small>
              </span>
            </div>
            {about ? (
              <p className="mt-5 max-w-xs text-[13px] leading-8 text-[#94a49a]">{about}</p>
            ) : null}
            <div className="mt-6 flex gap-2">
              <a
                href={cleanLink(settings.instagram_url, "https://instagram.com/")}
                target="_blank"
                rel="noreferrer"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-[11px] font-bold transition hover:border-[var(--gold)] hover:text-[var(--gold)]"
              >
                IG
              </a>
              <a
                href={cleanLink(settings.facebook_url, "https://facebook.com/")}
                target="_blank"
                rel="noreferrer"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-[11px] font-bold transition hover:border-[var(--gold)] hover:text-[var(--gold)]"
              >
                FB
              </a>
              <a
                href={cleanLink(whatsapp, "https://wa.me/")}
                target="_blank"
                rel="noreferrer"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-[11px] font-bold transition hover:border-[var(--gold)] hover:text-[var(--gold)]"
              >
                WA
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-5 text-xs font-extrabold tracking-[0.18em] text-[#f7f2e7]">
              {settings.footer_shop_title || "تسوّق"}
            </h4>
            {shopLinks.map((link, index) => (
              <FooterLink key={`${link.href}-${index}`} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </div>

          <div>
            <h4 className="mb-5 text-xs font-extrabold tracking-[0.18em] text-[#f7f2e7]">
              {settings.footer_support_title || "خدمة العملاء"}
            </h4>
            {supportLinks.map((link, index) => (
              <FooterLink key={`${link.href}-${index}`} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </div>

          <div>
            <h4 className="mb-5 text-xs font-extrabold tracking-[0.18em] text-[#f7f2e7]">
              {settings.footer_contact_title || "تواصل معنا"}
            </h4>
            <p className="text-[13px] leading-8 text-[#94a49a]">
              {settings.store_address || "القاهرة، مصر"}
              <br />
              {settings.working_hours || "السبت – الخميس: 10 ص – 8 م"}
            </p>
            {badges.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {badges.map((badge, index) => (
                  <span
                    key={`${badge}-${index}`}
                    className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-[#b9c5bc]"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {(copyright || credit) ? (
          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-[11px] text-[#76887c]">
            {copyright ? <span>{fillPlaceholders(copyright, tokens)}</span> : <span />}
            {credit ? <span>{fillPlaceholders(credit, tokens)}</span> : null}
          </div>
        ) : null}
      </div>
    </footer>
  );
}
