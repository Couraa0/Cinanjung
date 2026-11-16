"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Empty, Logo } from "@/components/ui";
import { KEBUN_ROLES, LABEL, PASAR_ROLES, owns, pumpTick } from "@/lib/logic";
import { getDb, logout, mutate, nowIso, useDb, useOnline, useUser } from "@/lib/store";
import type { Role } from "@/lib/types";

// Satu daftar ini menentukan menu DAN hak akses halaman (Blueprint bagian 6 dan Technical Workflow 7.1).
const NAV: { group: string; items: { href: string; label: string; roles?: Role[] }[] }[] = [
  { group: "", items: [{ href: "/dashboard", label: "Ringkasan" }] },
  {
    group: "Smart Garden",
    items: [
      { href: "/dashboard/kebun", label: "Pemantauan", roles: KEBUN_ROLES },
      { href: "/dashboard/kebun/budidaya", label: "Budidaya", roles: KEBUN_ROLES },
      { href: "/dashboard/kebun/panen", label: "Panen", roles: KEBUN_ROLES },
      { href: "/dashboard/kebun/peringatan", label: "Peringatan", roles: KEBUN_ROLES },
    ],
  },
  {
    group: "Marketplace",
    items: [
      { href: "/dashboard/produk", label: "Produk", roles: PASAR_ROLES },
      { href: "/dashboard/pesanan", label: "Pesanan", roles: PASAR_ROLES },
      { href: "/dashboard/stok", label: "Stok", roles: PASAR_ROLES },
      { href: "/dashboard/pembukuan", label: "Pembukuan", roles: PASAR_ROLES },
      { href: "/dashboard/profil", label: "Profil usaha", roles: ["ADMIN_KWT", "ADMIN_UMKM"] },
      { href: "/dashboard/legalitas", label: "Panduan legalitas", roles: PASAR_ROLES },
    ],
  },
  {
    group: "Admin",
    items: [
      { href: "/dashboard/admin/pengguna", label: "Pengguna", roles: ["SUPER_ADMIN"] },
      { href: "/dashboard/admin/produsen", label: "Produsen", roles: ["SUPER_ADMIN"] },
      { href: "/dashboard/admin/perangkat", label: "Perangkat", roles: ["SUPER_ADMIN"] },
      { href: "/dashboard/admin/konfigurasi", label: "Konfigurasi", roles: ["SUPER_ADMIN"] },
      { href: "/dashboard/laporan", label: "Laporan", roles: ["SUPER_ADMIN", "PEMDES"] },
    ],
  },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const d = useDb();
  const user = useUser();
  const online = useOnline();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  // Pengaman batas waktu pompa tetap berjalan di halaman dashboard mana pun.
  useEffect(() => {
    const t = setInterval(() => {
      if (getDb().devices.some((x) => x.pumpOnSince)) mutate((db) => pumpTick(db, nowIso()));
    }, 5000);
    return () => clearInterval(t);
  }, []);

  if (!user) return null;

  const allowed = (roles?: Role[]) => !roles || roles.includes(user.role);
  const current = NAV.flatMap((g) => g.items).find((i) => i.href === pathname);
  const count: Record<string, number> = {
    "/dashboard/kebun/peringatan": d.alerts.filter((a) => !a.read).length,
    "/dashboard/pesanan": d.orders.filter(
      (o) => owns(user, o.producerId) && (o.status === "INQUIRY" || o.status === "PENDING_CONFIRMATION"),
    ).length,
  };

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside
        className={`${open ? "fixed inset-0 z-30 flex" : "hidden"} flex-col overflow-y-auto bg-daun-tua text-white md:sticky md:top-0 md:flex md:h-dvh`}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-4">
          <Link href="/" className="flex items-center gap-2 font-extrabold">
            <Logo className="size-7 text-pucuk" />
            Desa Cinanjung
          </Link>
          <button type="button" className="rounded-md px-2 py-1 text-sm font-semibold md:hidden" onClick={() => setOpen(false)}>
            Tutup
          </button>
        </div>

        <nav className="flex-1 px-3 pb-4" aria-label="Menu dashboard">
          {NAV.map((g) => {
            const items = g.items.filter((i) => allowed(i.roles));
            if (!items.length) return null;
            return (
              <div key={g.group} className="mt-4 first:mt-0">
                {g.group && <p className="px-2 pb-1 text-xs font-semibold text-white/55">{g.group}</p>}
                {items.map((i) => (
                  <Link
                    key={i.href}
                    href={i.href}
                    onClick={() => setOpen(false)}
                    aria-current={pathname === i.href ? "page" : undefined}
                    className={`flex items-center justify-between rounded-md px-2 py-2 text-sm font-semibold ${
                      pathname === i.href ? "bg-pucuk text-daun-tua" : "text-white/90 hover:bg-white/10"
                    }`}
                  >
                    {i.label}
                    {count[i.href] > 0 && (
                      <span className="rounded-full bg-pepaya px-2 text-xs font-bold text-tinta">{count[i.href]}</span>
                    )}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/15 px-5 py-4 text-sm">
          <p className="font-semibold">{user.name}</p>
          <p className="text-white/65">{LABEL[user.role]}</p>
          <div className="mt-3 flex gap-4 font-semibold">
            <Link href="/katalog" className="underline underline-offset-4">
              Lihat katalog
            </Link>
            <button type="button" className="underline underline-offset-4" onClick={logout}>
              Keluar
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-garis bg-white px-4 py-3 md:hidden">
          <button type="button" className="rounded-md border border-garis px-3 py-1.5 text-sm font-semibold" onClick={() => setOpen(true)}>
            Menu
          </button>
          <span className="font-extrabold text-daun-tua">{current?.label ?? "Dashboard"}</span>
        </header>
        <p className={`px-4 py-1.5 text-center text-sm md:px-8 ${online ? "bg-daun-muda text-daun-tua" : "bg-pepaya-muda text-pepaya-tua"}`}>
          {online
            ? "Prototipe dengan data contoh. Perubahan tersimpan di browser ini saja."
            : "Internet terputus. Anda tetap bisa mencatat, data tersimpan di perangkat ini."}
        </p>
        <main className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
          {allowed(current?.roles) ? children : <Empty>Peran {LABEL[user.role]} tidak punya akses ke halaman ini.</Empty>}
        </main>
      </div>
    </div>
  );
}
