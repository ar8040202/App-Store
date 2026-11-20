import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import {
  deleteCategory,
  listAdminCategories,
  saveCategory,
  type CategoryInput,
} from "@/lib/store";

export const runtime = "nodejs";

async function guard() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }
  return null;
}

const text = (value: unknown) => (value == null ? "" : String(value));
const numberOrZero = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function clean(body: Record<string, unknown>): CategoryInput {
  return {
    id: body.id ? Number(body.id) : undefined,
    name: text(body.name).trim(),
    slug: text(body.slug).trim(),
    description: text(body.description).trim() || null,
    image_url: text(body.image_url).trim() || null,
    sort_order: numberOrZero(body.sort_order),
    is_active: body.is_active !== false,
  };
}

export async function GET() {
  const blocked = await guard();
  if (blocked) return blocked;
  return NextResponse.json({ categories: await listAdminCategories() });
}

export async function POST(request: Request) {
  const blocked = await guard();
  if (blocked) return blocked;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const category = await saveCategory(clean(body));
    return NextResponse.json({ ok: true, category });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر حفظ القسم";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const blocked = await guard();
  if (blocked) return blocked;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.id) {
      return NextResponse.json({ error: "القسم غير محدد" }, { status: 400 });
    }
    const category = await saveCategory(clean(body));
    return NextResponse.json({ ok: true, category });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر تحديث القسم";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const blocked = await guard();
  if (blocked) return blocked;
  try {
    const body = (await request.json()) as { id?: number };
    if (!body.id) {
      return NextResponse.json({ error: "القسم غير محدد" }, { status: 400 });
    }
    await deleteCategory(Number(body.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر حذف القسم";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
