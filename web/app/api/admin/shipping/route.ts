import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import {
  getSettings,
  listAdminGovernorates,
  updateGovernorates,
  updateSettings,
  type GovernorateInput,
} from "@/lib/store";

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
  const [governorates, settings] = await Promise.all([
    listAdminGovernorates(),
    getSettings(),
  ]);
  return NextResponse.json({
    governorates,
    free_shipping_enabled: settings.free_shipping_enabled !== "false",
    free_shipping_threshold: Number(settings.free_shipping_threshold) || 1500,
    default_shipping_fee: Number(settings.default_shipping_fee) || 0,
  });
}

export async function PUT(request: Request) {
  const blocked = await guard();
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as {
      governorates?: { id: number; fee: unknown; is_active: unknown }[];
      free_shipping_enabled?: boolean;
      free_shipping_threshold?: number;
    };

    if (!Array.isArray(body.governorates)) {
      return NextResponse.json({ error: "بيانات المحافظات غير صحيحة" }, { status: 400 });
    }

    const clean: GovernorateInput[] = body.governorates.map((item) => {
      const fee = Number(item.fee);
      if (!Number.isFinite(fee) || fee < 0) throw new Error("قيمة الشحن غير صحيحة");
      return {
        id: Number(item.id),
        fee: Math.round(fee * 100) / 100,
        is_active: Boolean(item.is_active),
      };
    });

    await updateGovernorates(clean);

    const settings: Record<string, string> = {};
    if (typeof body.free_shipping_enabled === "boolean") {
      settings.free_shipping_enabled = String(body.free_shipping_enabled);
    }
    if (body.free_shipping_threshold !== undefined) {
      const threshold = Number(body.free_shipping_threshold);
      if (!Number.isFinite(threshold) || threshold < 0) {
        throw new Error("حد الشحن المجاني غير صحيح");
      }
      settings.free_shipping_threshold = String(threshold);
    }
    if (Object.keys(settings).length) await updateSettings(settings);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذّر الحفظ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
