import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import ProductDetail from "@/components/ProductDetail";
import { getCatalog } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function findProduct(slug: string) {
  const catalog = await getCatalog();
  const wanted = decode(slug);
  const product = catalog.products.find((item) => item.slug === wanted);
  return product ? { catalog, product } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await findProduct(slug);
  return {
    title: found ? found.product.name : "المنتج غير موجود",
    description: found?.product.description?.slice(0, 160) || "تفاصيل المنتج في EMO STORE",
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const found = await findProduct(slug);
  if (!found) notFound();

  const { catalog, product } = found;
  const currency = catalog.settings.store_currency || "ج.م";
  const related = [
    ...catalog.products.filter((item) => item.id !== product.id && item.category_id === product.category_id),
    ...catalog.products.filter((item) => item.id !== product.id && item.category_id !== product.category_id),
  ].slice(0, 4);

  return (
    <>
      <ProductDetail product={product} currency={currency} />

      {related.length ? (
        <section className="border-t border-[var(--line)] bg-white/50 py-16 sm:py-20">
          <div className="container-x">
            <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="eyebrow">قد يعجبك كمان</span>
                <h2 className="section-title mt-4">قطع من نفس الاختيار</h2>
              </div>
              <Link href="/shop" className="btn-line !py-2.5 !text-xs">كل المنتجات</Link>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-7">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} currency={currency} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
