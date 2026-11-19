import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { listOrders, updateOrderStatus } from "@/lib/store";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

export const runtime = "nodejs";

async function guard() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const blocked = await guard();
  if (blocked) return blocked;
  return NextResponse.json({ orders: await listOrders() });
}

export async function PATCH(request: Request) {
  const blocked = await guard();
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as { id?: number; status?: string };
    if (!body.id || !body.status || !(body.status in ORDER_STATUS_LABELS)) {
      return NextResponse.json({ error: "حالة الطلب غير صحيحة" }, { status: 400 });
    }
    await updateOrderStatus(Number(body.id), body.status);
    return NextResponse.json({ ok: true, stockRestored: body.status === "cancelled" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر تحديث الطلب";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
