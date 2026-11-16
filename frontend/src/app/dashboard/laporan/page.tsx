"use client";
import { Empty, PageHead, Stat, Status, TableWrap } from "@/components/ui";
import { bulan, lalu } from "@/lib/format";
import { LABEL, dayKey, monthKey, rupiah, sumBy } from "@/lib/logic";
import { useDb, useNow } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";

const STATUS: OrderStatus[] = ["INQUIRY", "PENDING_CONFIRMATION", "CONFIRMED", "PROCESSING", "COMPLETED", "CANCELLED"];

export default function Laporan() {
  const d = useDb();
  const now = useNow(60000);
  const bulanIni = dayKey(now).slice(0, 7);

  const omzet = sumBy(d.sales, (s) => s.producerId, (s) => s.total);
  const omzetBulanIni = sumBy(d.sales.filter((s) => monthKey(s.date) === bulanIni), (s) => s.producerId, (s) => s.total);
  const transaksi = sumBy(d.sales, (s) => s.producerId, () => 1);
  const perBulan = sumBy(d.sales, (s) => monthKey(s.date), (s) => s.total);
  const total = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0);

  // Panen dikelompokkan per tanaman dan satuan, supaya kg tidak tercampur dengan ikat.
  const panen = new Map<string, { crop: string; unit: string; kali: number; dipanen: number; layak: number }>();
  for (const h of d.harvests) {
    const crop = d.batches.find((b) => b.id === h.batchId)?.cropName ?? "Tanpa batch";
    const e = panen.get(`${crop}|${h.unit}`) ?? { crop, unit: h.unit, kali: 0, dipanen: 0, layak: 0 };
    e.kali += 1;
    e.dipanen += h.quantity;
    e.layak += h.availableQuantity ?? 0;
    panen.set(`${crop}|${h.unit}`, e);
  }
  const mingguIni = d.alerts.filter((a) => now - Date.parse(a.timestamp) < 7 * 86400e3).length;

  return (
    <>
      <PageHead
        title="Laporan program"
        desc="Ringkasan perkembangan Smart Garden dan Circular Marketplace. Semua angka di sini berasal dari pencatatan pengguna dan data contoh, bukan target."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Omzet bulan ini" value={rupiah(total(omzetBulanIni))} sub="Semua produsen, belum dikurangi biaya" />
        <Stat label="Omzet sejak awal" value={rupiah(total(omzet))} sub={`${d.sales.length} transaksi tercatat`} />
        <Stat label="Produk terbit" value={d.products.filter((p) => p.status === "PUBLISHED").length} sub={`dari ${d.products.length} produk`} />
        <Stat label="Produsen terverifikasi" value={d.producers.filter((p) => p.verified).length} sub={`dari ${d.producers.length} terdaftar`} />
      </div>

      <h2 className="mt-8 mb-3 font-extrabold text-daun-tua">Penjualan per produsen</h2>
      <TableWrap>
        <table className="tbl">
          <thead>
            <tr>
              <th>Produsen</th>
              <th>Produk terbit</th>
              <th>Transaksi</th>
              <th>Omzet bulan ini</th>
              <th>Omzet sejak awal</th>
            </tr>
          </thead>
          <tbody>
            {d.producers.map((x) => (
              <tr key={x.id}>
                <td>
                  <span className="font-semibold">{x.name}</span>
                  <span className="block text-redup">{LABEL[x.type]}</span>
                </td>
                <td className="tabular-nums">{d.products.filter((p) => p.producerId === x.id && p.status === "PUBLISHED").length}</td>
                <td className="tabular-nums">{transaksi[x.id] ?? 0}</td>
                <td className="tabular-nums">{rupiah(omzetBulanIni[x.id] ?? 0)}</td>
                <td className="font-semibold tabular-nums">{rupiah(omzet[x.id] ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-extrabold text-daun-tua">Omzet per bulan</h2>
          {Object.keys(perBulan).length === 0 ? (
            <Empty>Belum ada penjualan tercatat.</Empty>
          ) : (
            <TableWrap>
              <table className="tbl">
                <tbody>
                  {Object.keys(perBulan)
                    .sort()
                    .reverse()
                    .map((k) => (
                      <tr key={k}>
                        <td>{bulan(k)}</td>
                        <td className="text-right font-semibold tabular-nums">{rupiah(perBulan[k])}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </div>
        <div>
          <h2 className="mb-3 font-extrabold text-daun-tua">Pesanan menurut status</h2>
          <TableWrap>
            <table className="tbl">
              <tbody>
                {STATUS.map((s) => (
                  <tr key={s}>
                    <td>
                      <Status value={s} />
                    </td>
                    <td className="text-right font-semibold tabular-nums">{d.orders.filter((o) => o.status === s).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
      </div>

      <h2 className="mt-8 mb-3 font-extrabold text-daun-tua">Hasil panen KWT</h2>
      {panen.size === 0 ? (
        <Empty>Belum ada catatan panen.</Empty>
      ) : (
        <TableWrap>
          <table className="tbl">
            <thead>
              <tr>
                <th>Tanaman</th>
                <th>Jumlah panen</th>
                <th>Total dipanen</th>
                <th>Terverifikasi layak jual</th>
              </tr>
            </thead>
            <tbody>
              {[...panen.values()].map((p) => (
                <tr key={`${p.crop}|${p.unit}`}>
                  <td className="font-semibold">{p.crop}</td>
                  <td className="tabular-nums">{p.kali} kali</td>
                  <td className="tabular-nums">
                    {p.dipanen} {p.unit}
                  </td>
                  <td className="tabular-nums">
                    {p.layak} {p.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      <h2 className="mt-8 mb-3 font-extrabold text-daun-tua">Smart Garden</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Batch tanaman aktif" value={d.batches.filter((b) => b.active).length} sub={`dari ${d.batches.length} batch`} />
        <Stat label="Peringatan 7 hari terakhir" value={mingguIni} />
        <Stat label="Perangkat terdaftar" value={d.devices.length} />
      </div>
      {d.devices.length > 0 && (
        <ul className="mt-3 divide-y divide-garis/60 rounded-lg border border-garis bg-white text-sm">
          {d.devices.map((dev) => (
            <li key={dev.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <span className="font-semibold">{dev.id}</span>
              <Status value={dev.status} />
              <span className="text-redup">{dev.lastSeen ? `data terakhir ${lalu(dev.lastSeen, now)}` : "belum pernah mengirim data"}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
