import type { Metadata, Viewport } from "next";
import { Inter, Newsreader, UnifrakturMaguntia } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { ActiveTimersBar } from "@/components/timer/ActiveTimersBar";
import { TimerEngine } from "@/components/timer/TimerEngine";
import { TimerSheet } from "@/components/timer/TimerSheet";
import { TabBar } from "@/components/nav/TabBar";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { Toaster } from "@/components/ui/Toaster";
import { DataProvider } from "@/lib/data/provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  style: ["normal", "italic"],
  weight: ["400", "500", "700", "800"],
});
const fraktur = UnifrakturMaguntia({ subsets: ["latin"], weight: "400", variable: "--font-unifraktur", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Küchen Fusion", template: "%s · Küchen Fusion" },
  description: "Rezepte aus jedem Link – gemeinsam kochen, planen und einkaufen.",
  applicationName: "Küchen Fusion",
  appleWebApp: { capable: true, title: "Küchen Fusion", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${inter.variable} ${newsreader.variable} ${fraktur.variable}`}>
      <body>
        <NextIntlClientProvider>
          <DataProvider>
            <main className="mx-auto min-h-dvh max-w-xl pb-[calc(76px+env(safe-area-inset-bottom))]">{children}</main>
            <ActiveTimersBar />
            <TabBar />
            <TimerSheet />
            <TimerEngine />
            <Toaster />
            <ServiceWorkerRegistrar />
          </DataProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
