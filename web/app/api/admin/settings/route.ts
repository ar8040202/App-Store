import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/store";
import type { Settings } from "@/lib/types";

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
  return NextResponse.json({ settings: await getSettings() });
}

export async function PUT(request: Request) {
  const blocked = await guard();
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as { settings?: Settings };
    if (!body.settings || typeof body.settings !== "object") {
      return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
    }
    const clean: Settings = {};
    for (const [key, value] of Object.entries(body.settings)) {
      clean[key] = typeof value === "string" ? value : String(value ?? "");
    }
    await updateSettings(clean);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر حفظ الإعدادات";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
