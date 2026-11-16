import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import { ClientGate } from "@/components/client-gate";
import { SITE_URL } from "@/lib/env";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Desa Cinanjung: Smart Garden + Circular Marketplace",
  description:
    "Katalog hasil kebun KWT Bidara dan produk UMKM Desa Cinanjung, dengan pemantauan greenhouse dan pembukuan sederhana.",
  applicationName: "Desa Cinanjung",
  appleWebApp: { capable: true, title: "Cinanjung" },
};

export const viewport: Viewport = { themeColor: "#1e5a3a" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full">
        {/* Semua data masih di localStorage, jadi halaman dirender di browser (lihat ClientGate). */}
        <Suspense>
          <ClientGate>{children}</ClientGate>
        </Suspense>
      </body>
    </html>
  );
}
