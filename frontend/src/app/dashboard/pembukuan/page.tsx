"use client";
import type { FormEvent } from "react";
import { Bars } from "@/components/chart";
import { Button, Card, Empty, ErrorNote, Field, PageHead, Stat, TableWrap } from "@/components/ui";
import { bulan, tglJam } from "@/lib/format";
import { bestSellers, dayKey, monthKey, owns, recordSale, rupiah, sumBy } from "@/lib/logic";
import { formData, mutate, nowIso, useDb, useNow, useTry, useUser } from "@/lib/store";

export default function Pembukuan() {
  const d = useDb();
  const user = useUser()!;
  const now = useNow(600000);
  const [error, run] = useTry();

  const hariIni = dayKey(now);
  const bulanIni = hariIni.slice(0, 7);
  const products = d.products.filter((p) => owns(user, p.producerId));
  const sales = d.sales.filter((s) => owns(user, s.producerId)).sort((a, b) => b.date.localeCompare(a.date));
  const salesBulanIni = sales.filter((s) => monthKey(s.date) === bulanIni);
  const perHari = sumBy(sales, (s) => dayKey(s.date), (s) => s.total);
  const perBulan = sumBy(sales, (s) => monthKey(s.date), (s) => s.total);
  const jumlahPerBulan = sumBy(sales, (s) => monthKey(s.date), () => 1);
  const terlaris = bestSellers(salesBulanIni);
  const duaMinggu = Array.from({ length: 14 }, (_, i) => {
    const t = new Date(now - (13 - i) * 86400e3);
    return { label: `${t.getDate()}/${t.getMonth() + 1}`, value: perHari[dayKey(t)] ?? 0 };
  });

  function catat(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = formData(e);
    const form = e.currentTarget;
    // Tanggal lampau disimpan jam 12 siang waktu setempat supaya tidak bergeser hari.
    const date = f.date === hariIni ? nowIso() : new Date(`${f.date}T12:00:00`).toISOString();
    const ok = run(() => mutate((db) => recordSale(db, { productId: f.productId, qty: Number(f.qty), date, note: f.note })));
    if (ok) form.reset();
  }

  return (
    <>
      <PageHead
        title="Pembukuan"
        desc="Mencatat penjualan dan omzet. Omzet adalah total uang penjualan, belum dikurangi biaya bahan dan tenaga, jadi bukan laba."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Omzet hari ini" value={rupiah(perHari[hariIni] ?? 0)} />
        <Stat label="Omzet bulan ini" value={rupiah(perBulan[bulanIni] ?? 0)} />
        <Stat label="Transaksi bulan ini" value={salesBulanIni.length} />
        <Stat label="Terlaris bulan ini" value={terlaris[0]?.name ?? "Belum ada"} sub={terlaris[0] && `${terlaris[0].qty} ${terlaris[0].unit} terjual`} />
      </div>

      <Card className="mt-6">
        <h2 className="font-extrabold text-daun-tua">Catat penjualan langsung</h2>
        <p className="mt-1 text-sm text-redup">
          Untuk penjualan di luar pesanan WhatsApp, misalnya titip jual atau beli di tempat. Pesanan yang diselesaikan di menu
          Pesanan sudah tercatat otomatis.
        </p>
        {products.length === 0 ? (
          <p className="mt-3 text-redup">Belum ada produk untuk dicatat.</p>
        ) : (
          <form onSubmit={catat} className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.6fr_7rem_10rem_1.4fr_auto]">
            <Field label="Produk terjual">
              <select name="productId" className="inp" required>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}, {rupiah(p.price)}/{p.unit} (stok {p.stock})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Jumlah">
              <input name="qty" type="number" min={0.1} step="any" className="inp" required />
            </Field>
            <Field label="Tanggal">
              <input name="date" type="date" className="inp" defaultValue={hariIni} max={hariIni} required />
            </Field>
            <Field label="Catatan" hint="opsional">
              <input name="note" className="inp" placeholder="Titip jual di warung" />
            </Field>
            <div className="self-end">
              <Button type="submit">Catat penjualan</Button>
            </div>
          </form>
        )}
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="mb-4 font-extrabold text-daun-tua">Omzet 14 hari terakhir</h2>
        <Bars data={duaMinggu} format={rupiah} />
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-extrabold text-daun-tua">Rekap per bulan</h2>
          <TableWrap>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Bulan</th>
                  <th>Transaksi</th>
                  <th>Omzet</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(perBulan)
                  .sort()
                  .reverse()
                  .map((k) => (
                    <tr key={k}>
                      <td>{bulan(k)}</td>
                      <td className="tabular-nums">{jumlahPerBulan[k]}</td>
                      <td className="font-semibold tabular-nums">{rupiah(perBulan[k])}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
        <div>
          <h2 className="mb-3 font-extrabold text-daun-tua">Produk terlaris bulan ini</h2>
          {terlaris.length === 0 ? (
            <Empty>Belum ada penjualan bulan ini.</Empty>
          ) : (
            <TableWrap>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Terjual</th>
                    <th>Omzet</th>
                  </tr>
                </thead>
                <tbody>
                  {terlaris.map((t) => (
                    <tr key={t.name}>
                      <td>{t.name}</td>
                      <td className="tabular-nums">
                        {t.qty} {t.unit}
                      </td>
                      <td className="font-semibold tabular-nums">{rupiah(t.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </div>
      </div>

      <h2 className="mt-8 mb-3 font-extrabold text-daun-tua">Riwayat penjualan</h2>
      {sales.length === 0 ? (
        <Empty>Belum ada penjualan tercatat.</Empty>
      ) : (
        <TableWrap>
          <table className="tbl">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Produk</th>
                <th>Total</th>
                <th>Sumber</th>
              </tr>
            </thead>
            <tbody>
              {sales.slice(0, 60).map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap">{tglJam(s.date)}</td>
                  <td>{s.items.map((i) => `${i.name}, ${i.qty} ${i.unit}`).join("; ")}</td>
                  <td className="font-semibold whitespace-nowrap tabular-nums">{rupiah(s.total)}</td>
                  <td>{s.orderId ? `Pesanan ${s.orderId}` : s.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </>
  );
}
