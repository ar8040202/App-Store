import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import {
  deleteProduct,
  listAdminProducts,
  saveProduct,
  type ProductInput,
} from "@/lib/store";

export const runtime = "nodejs";

async function guard() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }
  return null;
}

const text = (value: unknown) => (value == null ? "" : String(value));
const numberOrNull = (value: unknown) =>
  value === "" || value == null ? null : Number(value);

function clean(body: Record<string, unknown>): ProductInput {
  return {
    id: body.id ? Number(body.id) : undefined,
    name: text(body.name).trim(),
    slug: text(body.slug).trim(),
    description: text(body.description).trim() || null,
    details: text(body.details).trim() || null,
    price: Number(body.price),
    compare_at_price: numberOrNull(body.compare_at_price),
    stock: Number(body.stock),
    image_url: text(body.image_url).trim() || null,
    gallery: text(body.gallery).trim() || null,
    sizes: text(body.sizes).trim() || null,
    colors: text(body.colors).trim() || null,
    category_id: numberOrNull(body.category_id),
    is_active: body.is_active !== false,
    is_featured: body.is_featured === true,
    rating: numberOrNull(body.rating),
    reviews_count: numberOrNull(body.reviews_count),
  };
}

export async function GET() {
  const blocked = await guard();
  if (blocked) return blocked;
  return NextResponse.json({ products: await listAdminProducts() });
}

export async function POST(request: Request) {
  const blocked = await guard();
  if (blocked) return blocked;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const product = await saveProduct(clean(body));
    return NextResponse.json({ ok: true, product });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر حفظ المنتج";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const blocked = await guard();
  if (blocked) return blocked;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.id) {
      return NextResponse.json({ error: "المنتج غير محدد" }, { status: 400 });
    }
    const product = await saveProduct(clean(body));
    return NextResponse.json({ ok: true, product });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر تحديث المنتج";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const blocked = await guard();
  if (blocked) return blocked;
  try {
    const body = (await request.json()) as { id?: number };
    if (!body.id) {
      return NextResponse.json({ error: "المنتج غير محدد" }, { status: 400 });
    }
    await deleteProduct(Number(body.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر حذف المنتج";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
