import { NextResponse } from "next/server";
import { createOrder } from "@/lib/store";
import type { CreateOrderInput } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateOrderInput;

    if (!body.customer_name?.trim() || !body.customer_phone?.trim()) {
      return NextResponse.json({ error: "الاسم ورقم الهاتف مطلوبان" }, { status: 400 });
    }
    if (!body.governorate || !body.city?.trim() || !body.address?.trim()) {
      return NextResponse.json({ error: "بيانات التوصيل غير مكتملة" }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "السلة فاضية" }, { status: 400 });
    }

    const order = await createOrder(body);
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "حدث خطأ، حاول مرة أخرى";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
