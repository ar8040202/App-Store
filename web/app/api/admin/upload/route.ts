import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { uploadImage } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "لم يتم اختيار صورة" }, { status: 400 });
    }
    const url = await uploadImage(file as File);
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر رفع الصورة";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
