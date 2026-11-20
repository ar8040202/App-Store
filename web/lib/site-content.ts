/** القيم الافتراضية لمحتوى الشريط المتحرك والفوتر. */
export const CONTENT_DEFAULTS: Record<string, string> = {
  marquee_items:
    "شحن مجاني فوق 1,500 ج.م\nدفع عند الاستلام\nقطع أصلية 100%\nاسترجاع خلال 14 يوم\nتوصيل لكل المحافظات",
  trust_items:
    "شحن لكل المحافظات | توصيل سريع وآمن\nالدفع عند الاستلام | بدون رسوم إضافية\nاسترجاع خلال 14 يوم | تسوّق براحة بال\nمنتجات أصلية | خامات تستحق البقاء",
  footer_about:
    "قطع مختارة بعناية، لتفاصيل تستحقها. تجربة شراء بسيطة وآمنة من قلب مصر.",
  footer_shop_title: "تسوّق",
  footer_shop_links:
    "كل المنتجات | /shop\nنسائي | /shop?category=women\nرجالي | /shop?category=men\nالعطور | /shop?category=perfumes",
  footer_support_title: "خدمة العملاء",
  footer_support_links:
    "تتبع طلبك | /track\nسلة التسوق | /cart\nاتصل بنا | tel:{phone}\nراسلنا | mailto:{email}",
  footer_contact_title: "تواصل معنا",
  footer_payment_badges: "الدفع عند الاستلام\nإنستاباي\nمحفظة إلكترونية",
  footer_copyright: "© {year} {store}. كل الحقوق محفوظة.",
  footer_credit: "صُنع بـ ♥ في مصر",
};

export function contentLines(value: string | null | undefined): string[] {
  return (value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export type ContentPair = { title: string; subtitle: string };

/** كل سطر: العنوان | الوصف */
export function contentPairs(value: string | null | undefined): ContentPair[] {
  return contentLines(value)
    .map((line) => {
      const [title, subtitle] = line.split("|").map((part) => (part || "").trim());
      return { title, subtitle };
    })
    .filter((pair) => pair.title);
}

export type ContentLink = { label: string; href: string };

/** كل سطر: العنوان | الرابط */
export function contentLinks(value: string | null | undefined): ContentLink[] {
  return contentLines(value)
    .map((line) => {
      const [label, href] = line.split("|").map((part) => (part || "").trim());
      return { label, href: href || "#" };
    })
    .filter((link) => link.label);
}

export function fillPlaceholders(
  text: string,
  values: Record<string, string>,
): string {
  return text
    .replace(/\{year\}/g, values.year || "")
    .replace(/\{store\}/g, values.store || "")
    .replace(/\{phone\}/g, values.phone || "")
    .replace(/\{email\}/g, values.email || "");
}
