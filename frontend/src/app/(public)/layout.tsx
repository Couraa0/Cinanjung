"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo, btn } from "@/components/ui";
import { useOnline, useUser } from "@/lib/store";

export default function PublicLayout({ children }: { children: ReactNode }) {
  const user = useUser();
  const online = useOnline();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-garis bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-daun-tua">
            <Logo className="size-7 text-daun" />
            <span className="leading-tight font-extrabold whitespace-nowrap">
              Desa Cinanjung
              <span className="block text-xs font-medium text-redup">Circular Marketplace</span>
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-1 text-sm font-semibold">
            <Link href="/katalog" className="rounded-md px-2 py-2 hover:bg-daun-muda sm:px-3">
              Katalog
            </Link>
            <Link href="/#produsen" className="hidden rounded-md px-3 py-2 hover:bg-daun-muda sm:block">
              Produsen
            </Link>
            <Link href={user ? "/dashboard" : "/login"} className={`ml-1 ${btn("secondary", "sm")}`}>
              {user ? "Dashboard" : "Masuk"}
            </Link>
          </nav>
        </div>
        {!online && (
          <p className="bg-pepaya-muda px-4 py-1.5 text-center text-sm text-pepaya-tua">
            Internet terputus. Halaman yang sudah pernah dibuka tetap bisa dilihat.
          </p>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-garis bg-white">
        <div className="mx-auto max-w-6xl space-y-2 px-4 py-8 text-sm text-redup">
          <p className="font-semibold text-tinta">Smart Garden + Circular Marketplace, Desa Cinanjung, Kabupaten Sumedang</p>
          <p>
            Pemesanan dilanjutkan lewat WhatsApp. Ketersediaan, harga akhir, dan pembayaran disepakati langsung dengan
            penjual.
          </p>
          <p>
            Ini masih prototipe: produk, harga, stok, dan nomor WhatsApp yang tampil adalah data contoh. Dibuat oleh Tim
            GenAphYah untuk ACC #NextGreen Leaders Challenge 2026.
          </p>
        </div>
      </footer>
    </div>
  );
}
