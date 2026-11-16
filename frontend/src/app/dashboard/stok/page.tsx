"use client";
import type { FormEvent } from "react";
import { Button, Card, Empty, ErrorNote, Field, PageHead, Status, TableWrap } from "@/components/ui";
import { tglJam } from "@/lib/format";
import { LABEL, moveStock, owns, productStatus } from "@/lib/logic";
import { formData, mutate, nowIso, useDb, useTry, useUser } from "@/lib/store";
import type { MovementType } from "@/lib/types";

const JENIS: Record<string, [MovementType, 1 | -1, string]> = {
  produksi: ["PRODUCTION", 1, "Tambah stok dari produksi"],
  tambah: ["ADJUSTMENT", 1, "Koreksi: tambah (salah hitung)"],
  kurang: ["ADJUSTMENT", -1, "Koreksi: kurangi (rusak, dipakai sendiri)"],
};

export default function Stok() {
  const d = useDb();
  const user = useUser()!;
  const [error, run] = useTry();
  const products = d.products.filter((p) => owns(user, p.producerId));
  const ids = new Set(products.map((p) => p.id));
  const riwayat = d.movements
    .filter((m) => ids.has(m.productId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 60);

  function simpan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = formData(e);
    const form = e.currentTarget;
    const [type, sign, label] = JENIS[f.jenis];
    const ok = run(() => mutate((db) => moveStock(db, f.productId, type, sign * Number(f.qty), f.note.trim() || label, nowIso())));
    if (ok) form.reset();
  }

  if (products.length === 0) return <Empty>Belum ada produk. Tambahkan produk dulu di menu Produk.</Empty>;

  return (
    <>
      <PageHead
        title="Stok"
        desc="Setiap perubahan stok dicatat sebagai riwayat, jadi angka stok selalu bisa ditelusuri asalnya. Stok tidak bisa menjadi minus."
      />

      <Card className="mb-6">
        <h2 className="font-extrabold text-daun-tua">Ubah stok</h2>
        <form onSubmit={simpan} className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.4fr_1.4fr_7rem_1.4fr_auto]">
          <Field label="Produk">
            <select name="productId" className="inp" required>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (stok {p.stock} {p.unit})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Jenis perubahan">
            <select name="jenis" className="inp">
              {Object.entries(JENIS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v[2]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Jumlah">
            <input name="qty" type="number" min={0.1} step="any" className="inp" required />
          </Field>
          <Field label="Catatan" hint="opsional">
            <input name="note" className="inp" />
          </Field>
          <div className="self-end">
            <Button type="submit">Simpan</Button>
          </div>
        </form>
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      </Card>

      <h2 className="mb-3 font-extrabold text-daun-tua">Stok saat ini</h2>
      <TableWrap>
        <table className="tbl">
          <thead>
            <tr>
              <th>Produk</th>
              <th>Stok</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className="font-semibold">{p.name}</td>
                <td className="tabular-nums">
                  {p.stock} {p.unit}
                </td>
                <td>
                  <Status value={productStatus(p)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>

      <h2 className="mt-8 mb-3 font-extrabold text-daun-tua">Riwayat pergerakan stok</h2>
      <TableWrap>
        <table className="tbl">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Produk</th>
              <th>Jenis</th>
              <th>Jumlah</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {riwayat.map((m) => {
              const p = products.find((x) => x.id === m.productId);
              return (
                <tr key={m.id}>
                  <td className="whitespace-nowrap">{tglJam(m.createdAt)}</td>
                  <td>{p?.name}</td>
                  <td className="whitespace-nowrap">{LABEL[m.type]}</td>
                  <td className={`whitespace-nowrap font-semibold tabular-nums ${m.qty < 0 ? "text-merah" : "text-daun"}`}>
                    {m.qty > 0 ? "+" : "−"}
                    {Math.abs(m.qty)} {p?.unit}
                  </td>
                  <td>{m.note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
