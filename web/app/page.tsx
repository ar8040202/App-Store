import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getCatalog, imageSrc, money } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const catalog = await getCatalog();
  const currency = catalog.settings.store_currency || "ج.م";
  const featured = catalog.products.filter((p) => p.is_featured).slice(0, 8);
  const shown = featured.length >= 4 ? featured : catalog.products.slice(0, 8);
  const heroProduct = catalog.products[0];
  const heroImage = imageSrc(heroProduct?.image_url || "/images/hero-store.jpg");

  return (
    <>
      {/* HERO */}
      <section className="grain relative overflow-hidden bg-[var(--brand)] text-white">
        <div className="pointer-events-none absolute -start-40 -top-40 h-[520px] w-[520px] rounded-full bg-[var(--brand-2)]/60 blur-3xl" />
        <div className="pointer-events-none absolute -end-32 bottom-0 h-[420px] w-[420px] rounded-full bg-[var(--gold)]/10 blur-3xl" />

        <div className="container-x relative grid items-center gap-14 py-16 sm:py-24 lg:grid-cols-[1.02fr_0.98fr] lg:gap-20">
          <div className="fade-up">
            <span className="eyebrow">تشكيلة مختارة لعام 2026</span>
            <h1 className="display mt-6 text-[46px] leading-[1.18] sm:text-[64px] lg:text-[72px]">
              أناقة تبدأ من
              <br />
              <span className="relative inline-block text-[var(--gold)]">
                التفاصيل
                <svg className="absolute -bottom-2 w-full" height="12" viewBox="0 0 200 12" fill="none" preserveAspectRatio="none">
                  <path d="M2 9C60 2 140 2 198 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-8 max-w-lg text-[15px] leading-8 text-white/70 sm:text-base">
              {catalog.settings.store_tagline ||
                "قطع مختارة بعناية، لتفاصيل تستحقها"}{" "}
              — ملابس، أحذية، شنط، ساعات وعطور أصلية. شحن لكل المحافظات، ودفع عند الاستلام براحة بال.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/shop" className="btn-gold">
                تسوّق المجموعة
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </Link>
              <Link href="/track" className="btn-ghost">
                تتبع طلبك
              </Link>
            </div>

            <div className="mt-12 grid max-w-lg grid-cols-3 divide-x divide-x-reverse divide-white/15 border-t border-white/15 pt-7 text-center">
              <div>
                <strong className="display block text-2xl text-[var(--gold)] sm:text-3xl">+{catalog.products.length}</strong>
                <span className="mt-1 block text-[10px] text-white/55 sm:text-xs">قطعة مختارة</span>
              </div>
              <div>
                <strong className="display block text-2xl text-[var(--gold)] sm:text-3xl">27</strong>
                <span className="mt-1 block text-[10px] text-white/55 sm:text-xs">محافظة تغطيها</span>
              </div>
              <div>
                <strong className="display block text-2xl text-[var(--gold)] sm:text-3xl">14</strong>
                <span className="mt-1 block text-[10px] text-white/55 sm:text-xs">يوم للاسترجاع</span>
              </div>
            </div>
          </div>

          <div className="fade-up-2 relative mx-auto w-full max-w-[480px]">
            <div className="absolute -inset-5 -rotate-2 rounded-[240px_240px_36px_36px] border border-[var(--gold)]/50" />
            <div className="arch relative h-[430px] overflow-hidden shadow-2xl shadow-black/40 sm:h-[540px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImage} alt="تشكيلة EMO STORE" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>

            {heroProduct ? (
              <div className="hero-orbit absolute -bottom-6 -start-4 flex w-[240px] items-center gap-3 rounded-2xl border border-white/60 bg-white/95 p-3 shadow-2xl sm:-start-10 sm:w-[270px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageSrc(heroProduct.image_url)} alt="" className="h-16 w-14 shrink-0 rounded-xl object-cover sm:h-20 sm:w-16" />
                <div className="min-w-0 text-right text-[var(--ink)]">
                  <span className="text-[9px] font-bold text-[var(--muted)]">الأكثر مبيعًا</span>
                  <strong className="mt-0.5 block truncate text-xs sm:text-sm">{heroProduct.name}</strong>
                  <span className="mt-1 block text-xs font-extrabold text-[var(--brand)]">
                    {money(heroProduct.price, currency)}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="absolute -end-3 top-10 grid h-24 w-24 rotate-[-8deg] place-items-center rounded-2xl bg-[var(--gold)] text-center text-[#2b210e] shadow-xl sm:h-28 sm:w-28">
              <span className="text-[10px] font-extrabold leading-5 sm:text-xs">
                جودة عالية
                <br />
                بأسعار عادلة
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* MOVING STRIP */}
      <div className="overflow-hidden border-b border-[var(--line)] bg-[var(--gold-soft)] py-3">
        <div className="marquee-track flex w-max gap-10 whitespace-nowrap text-[11px] font-extrabold tracking-[0.18em] text-[#6b5427]">
          {Array.from({ length: 2 }).map((_, group) => (
            <span key={group} className="flex gap-10">
              <span>✦ شحن مجاني فوق 1,500 ج.م</span>
              <span>✦ دفع عند الاستلام</span>
              <span>✦ قطع أصلية 100%</span>
              <span>✦ استرجاع خلال 14 يوم</span>
              <span>✦ توصيل لكل المحافظات</span>
            </span>
          ))}
        </div>
      </div>

      {/* TRUST */}
      <section className="container-x grid gap-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["شحن لكل المحافظات", "توصيل سريع وآمن"],
          ["الدفع عند الاستلام", "بدون رسوم إضافية"],
          ["استرجاع خلال 14 يوم", "تسوّق براحة بال"],
          ["منتجات أصلية", "خامات تستحق البقاء"],
        ].map(([title, sub]) => (
          <div key={title} className="flex items-center gap-3 border-e border-[var(--line)] last:border-0 lg:px-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 13 4 4L19 7" />
              </svg>
            </span>
            <div>
              <strong className="block text-[13px]">{title}</strong>
              <span className="block text-[11px] text-[var(--muted)]">{sub}</span>
            </div>
          </div>
        ))}
      </section>

      {/* CATEGORIES */}
      <section className="container-x section">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">تصفّح حسب القسم</span>
            <h2 className="section-title mt-4">اختار ما يناسب ذوقك</h2>
          </div>
          <Link href="/shop" className="text-xs font-extrabold text-[var(--brand)] underline underline-offset-4">
            عرض كل الأقسام
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {catalog.categories.slice(0, 6).map((category) => (
            <Link
              key={category.id}
              href={`/shop?category=${category.slug}`}
              className="card-lift group relative aspect-[3/4] overflow-hidden rounded-[20px] bg-[#e9e2d5]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSrc(category.image_url)} alt={category.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" loading="lazy" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <span className="absolute inset-x-3 bottom-3 text-center text-[13px] font-extrabold text-white">{category.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="bg-white/50 py-16 sm:py-24">
        <div className="container-x">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="eyebrow">منتشرة هذا الأسبوع</span>
              <h2 className="section-title mt-4">قطع تستحق مكانًا في دولابك</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">{shown.length} قطعة اختارها فريقنا لك</p>
            </div>
            <Link href="/shop" className="btn-line !py-2.5 !text-xs">كل المنتجات</Link>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-7">
            {shown.map((product) => (
              <ProductCard key={product.id} product={product} currency={currency} />
            ))}
          </div>
        </div>
      </section>

      {/* STORY BAND */}
      <section className="grain relative mt-16 overflow-hidden bg-[#102b22] py-16 text-white sm:py-24">
        <div className="container-x relative grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="eyebrow">قصتنا</span>
            <h2 className="display mt-5 text-3xl leading-relaxed sm:text-5xl">
              مش مجرد متجر…
              <br />
              <span className="text-[var(--gold)]">تفاصيل بتفرق.</span>
            </h2>
            <p className="mt-6 max-w-lg text-sm leading-8 text-white/65">
              بدأنا بفكرة بسيطة: قطع حلوة، خامات محترمة، وسعر ما يوجعش. بنختار كل قطعة بنفسنا، وبنجرّبها قبل ما توصلك، عشان تشرى وأنت مرتاح.
            </p>
            <Link href="/shop" className="btn-ghost mt-8">اكتشف التشكيلة</Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              ["+19", "قطعة أصلية"],
              ["100%", "خامات مختارة"],
              ["27", "محافظة"],
              ["24/7", "دعم واتساب"],
            ].map(([number, label]) => (
              <div key={label} className="rounded-[22px] border border-white/10 bg-white/5 p-6 text-center backdrop-blur">
                <strong className="display block text-3xl text-[var(--gold)] sm:text-4xl">{number}</strong>
                <span className="mt-2 block text-[11px] text-white/60">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-x section">
        <div className="relative overflow-hidden rounded-[30px] bg-[var(--gold-soft)] px-6 py-12 text-center sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -end-10 -top-16 h-56 w-56 rounded-full bg-white/50 blur-2xl" />
          <h2 className="display relative text-3xl sm:text-5xl">جاهز تختار قطعتك الجديدة؟</h2>
          <p className="relative mx-auto mt-4 max-w-md text-sm text-[#6b5427]">
            تصفّح المجموعة كاملة، واختار اللي يعبّر عنك. الطلب بسيط والتوصيل لكل المحافظات.
          </p>
          <Link href="/shop" className="btn-dark relative mt-7">ابدأ التسوق</Link>
        </div>
      </section>
    </>
  );
}
