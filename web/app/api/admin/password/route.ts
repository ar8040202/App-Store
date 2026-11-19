import { NextResponse } from "next/server";
import { hashPassword, isAdmin, verifyCurrentPassword } from "@/lib/auth";
import { setAdminPasswordHash } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      current?: string;
      next?: string;
      confirm?: string;
    };
    const current = body.current || "";
    const next = body.next || "";
    const confirm = body.confirm || "";

    if (!(await verifyCurrentPassword(current))) {
      return NextResponse.json(
        { error: "كلمة المرور الحالية غير صحيحة" },
        { status: 401 },
      );
    }
    if (next.length < 8) {
      return NextResponse.json(
        { error: "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف" },
        { status: 400 },
      );
    }
    if (next !== confirm) {
      return NextResponse.json(
        { error: "تأكيد كلمة المرور غير مطابق" },
        { status: 400 },
      );
    }

    await setAdminPasswordHash(hashPassword(next));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر تغيير كلمة المرور";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
