import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/components/CartProvider";
import { getSettings } from "@/lib/store";

export const metadata: Metadata = {
  title: {
    default: "EMO STORE | قطع مختارة بعناية",
    template: "%s | EMO STORE",
  },
  description:
    "ملابس، أحذية، شنط، ساعات وعطور أصلية. تسوّق أونلاين مع شحن لكل المحافظات والدفع عند الاستلام.",
  icons: { icon: "/images/favicon.svg" },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();

  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen">
        <CartProvider>
          <Header
            storeName={settings.store_name || "EMO STORE"}
            storeNameEn={settings.store_name_en || "EMO STORE"}
          />
          <main>{children}</main>
          <Footer settings={settings} />
        </CartProvider>
      </body>
    </html>
  );
}
