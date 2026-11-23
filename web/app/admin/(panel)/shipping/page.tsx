import type { Metadata } from "next";
import AdminShippingClient from "@/components/AdminShippingClient";
import { getSettings, listAdminGovernorates } from "@/lib/store";

export const metadata: Metadata = { title: "الشحن والمحافظات" };
export const dynamic = "force-dynamic";

export default async function AdminShippingPage() {
  const [governorates, settings] = await Promise.all([
    listAdminGovernorates(),
    getSettings(),
  ]);
  return (
    <AdminShippingClient
      initialGovernorates={governorates}
      initialEnabled={settings.free_shipping_enabled !== "false"}
      initialThreshold={settings.free_shipping_threshold || "1500"}
    />
  );
}
