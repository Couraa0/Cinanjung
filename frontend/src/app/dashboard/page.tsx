"use client";
import Link from "next/link";
import { Card, PageHead, Stat, Status } from "@/components/ui";
import { lalu } from "@/lib/format";
import { KEBUN_ROLES, LABEL, PASAR_ROLES, SENSORS, isKwtAdmin, latestReading, monthKey, owns, productStatus, rupiah } from "@/lib/logic";
import { useDb, useNow, useUser } from "@/lib/store";

export default function Ringkasan() {
  const d = useDb();
  const user = useUser()!;
  const now = useNow(30000);
  const kebun = KEBUN_ROLES.includes(user.role);
  const pasar = PASAR_ROLES.includes(user.role);

  const dev = d.devices[0];
  const last = dev && latestReading(d, dev.id);
  const orders = d.orders.filter((o) => owns(user, o.producerId));
  const products = d.products.filter((p) => owns(user, p.producerId));
  const sales = d.sales.filter((s) => owns(user, s.producerId));
  const bulanIni = monthKey(new Date(now).toISOString());

  const n = {
    alert: d.alerts.filter((a) => !a.read).length,
    panen: d.harvests.filter((h) => h.status === "PENDING_REVIEW").length,
    siapKatalog: d.harvests.filter((h) => h.status === "APPROVED" && !h.productId).length,
    pesanan: orders.filter((o) => o.status === "INQUIRY" || o.status === "PENDING_CONFIRMATION").length,
    habis: products.filter((p) => productStatus(p) === "OUT_OF_STOCK").length,
    produsen: d.producers.filter((p) => !p.verified).length,
  };
  const tugas = [
    kebun && dev && dev.status !== "ONLINE" && { href: "/dashboard/kebun", text: `Perangkat ${dev.id} berstatus ${LABEL[dev.status].toLowerCase()}` },
    kebun && n.alert > 0 && { href: "/dashboard/kebun/peringatan", text: `${n.alert} peringatan belum dibaca` },
    isKwtAdmin(user.role) && n.panen > 0 && { href: "/dashboard/kebun/panen", text: `${n.panen} catatan panen menunggu verifikasi` },
    isKwtAdmin(user.role) && n.siapKatalog > 0 && { href: "/dashboard/kebun/panen", text: `${n.siapKatalog} panen terverifikasi belum masuk katalog` },
    pasar && n.pesanan > 0 && { href: "/dashboard/pesanan", text: `${n.pesanan} pesanan menunggu konfirmasi Anda` },
    pasar && n.habis > 0 && { href: "/dashboard/stok", text: `${n.habis} produk stoknya habis` },
    user.role === "SUPER_ADMIN" && n.produsen > 0 && { href: "/dashboard/admin/produsen", text: `${n.produsen} produsen belum diverifikasi` },
  ].filter((x) => !!x);

  return (
    <>
      <PageHead title={`Halo, ${user.name}`} desc={`Anda masuk sebagai ${LABEL[user.role]}.`} />

      <Card>
        <h2 className="font-extrabold text-daun-tua">Perlu ditindaklanjuti</h2>
        {tugas.length === 0 ? (
          <p className="mt-2 text-redup">Tidak ada yang mendesak saat ini.</p>
        ) : (
          <ul className="mt-2 divide-y divide-garis/60">
            {tugas.map((t) => (
              <li key={t.text}>
                <Link href={t.href} className="flex items-center justify-between gap-3 py-2.5 font-medium hover:text-daun">
                  {t.text}
                  <span className="text-sm font-semibold text-daun underline underline-offset-4">Buka</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {kebun && dev && (
        <section className="mt-8">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-extrabold text-daun-tua">Greenhouse</h2>
            <Status value={dev.status} />
            {dev.lastSeen && <span className="text-sm text-redup">data terakhir {lalu(dev.lastSeen, now)}</span>}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {dev.sensors.map((k) => (
              <Stat key={k} label={SENSORS[k].label} value={last?.[k] == null ? "Tidak terbaca" : `${last[k]} ${SENSORS[k].unit}`} />
            ))}
          </div>
        </section>
      )}

      {pasar && (
        <section className="mt-8">
          <h2 className="text-lg font-extrabold text-daun-tua">Penjualan</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Stat
              label="Omzet bulan ini"
              value={rupiah(sales.filter((s) => monthKey(s.date) === bulanIni).reduce((a, s) => a + s.total, 0))}
              sub="Omzet, belum dikurangi biaya"
            />
            <Stat label="Pesanan berjalan" value={orders.filter((o) => o.status === "CONFIRMED" || o.status === "PROCESSING").length} />
            <Stat label="Produk terbit" value={products.filter((p) => p.status === "PUBLISHED").length} sub={`dari ${products.length} produk`} />
          </div>
        </section>
      )}

      {user.role === "PEMDES" && (
        <p className="mt-8">
          <Link href="/dashboard/laporan" className="font-semibold text-daun underline underline-offset-4">
            Buka laporan perkembangan program
          </Link>
        </p>
      )}
    </>
  );
}
