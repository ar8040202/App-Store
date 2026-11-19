import { Suspense } from "react";
import type { Metadata } from "next";
import TrackClient from "@/components/TrackClient";
import { getSettings } from "@/lib/store";

export const metadata: Metadata = { title: "تتبع طلبك" };
export const dynamic = "force-dynamic";

export default async function TrackPage() {
  const settings = await getSettings();
  return (
    <Suspense fallback={<div className="container-x py-20 text-center text-sm text-[var(--muted)]">جارٍ التحميل…</div>}>
      <TrackClient currency={settings.store_currency || "ج.م"} />
    </Suspense>
  );
}
