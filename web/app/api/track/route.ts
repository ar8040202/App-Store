import { NextResponse } from "next/server";
import { findOrder } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { number?: string; phone?: string };
    if (!body.number?.trim() || !body.phone?.trim()) {
      return NextResponse.json({ error: "رقم الطلب ورقم الهاتف مطلوبان" }, { status: 400 });
    }
    const order = await findOrder(body.number, body.phone);
    if (!order) {
      return NextResponse.json({ error: "ما لقيناش طلب بهذه البيانات. تأكد من الرقم ورقم الهاتف." }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (error) {
    const message = error instanceof Error ? error.message : "حدث خطأ، حاول مرة أخرى";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
