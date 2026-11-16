"use client";
import { useState, type FormEvent } from "react";
import { Badge, Button, Card, ErrorNote, Field, PageHead, TableWrap } from "@/components/ui";
import { SENSORS, SENSOR_KEYS, uid } from "@/lib/logic";
import { formData, mutate, resetDb, useDb, useTry } from "@/lib/store";

export default function Konfigurasi() {
  const d = useDb();
  const [error, run] = useTry();
  const [saved, setSaved] = useState(false);
  const c = d.config;

  function simpanAmbang(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = formData(e);
    setSaved(
      run(() =>
        mutate((db) => {
          for (const k of SENSOR_KEYS) {
            const min = Number(f[`${k}.min`]);
            const max = Number(f[`${k}.max`]);
            if (!(min < max)) throw new Error(`Ambang ${SENSORS[k].label.toLowerCase()}: nilai minimum harus lebih kecil dari maksimum.`);
            db.config.thresholds[k] = { min, max };
          }
          const pump = Number(f.pumpMaxMinutes);
          const water = Number(f.minWaterForPump);
          const stale = Number(f.staleMinutes);
          if (!(pump > 0 && stale > 0 && water >= 0 && water <= 100)) throw new Error("Periksa lagi angka pengaman pompa dan batas data usang.");
          Object.assign(db.config, { pumpMaxMinutes: pump, minWaterForPump: water, staleMinutes: stale });
        }),
      ),
    );
  }

  function tambahKategori(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = formData(e);
    e.currentTarget.reset();
    mutate((db) => {
      db.categories.push({ id: uid("C"), name: f.name.trim(), group: f.group as "KEBUN" | "UMKM" });
    });
  }

  return (
    <>
      <PageHead title="Konfigurasi" desc="Ambang peringatan sensor, pengaman pompa, dan kategori produk." />

      <Card>
        <h2 className="font-extrabold text-daun-tua">Ambang sensor dan pengaman pompa</h2>
        <p className="mt-1 max-w-[75ch] text-sm text-redup">
          Peringatan dibuat saat pembacaan keluar dari ambang ini. Angka bawaan hanya contoh: tentukan ambang dari jenis
          tanaman dan sistem hidroponik yang dipakai KWT.
        </p>
        <form onSubmit={simpanAmbang} onChange={() => setSaved(false)} className="mt-4">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Minimum</th>
                  <th>Maksimum</th>
                </tr>
              </thead>
              <tbody>
                {SENSOR_KEYS.map((k) => (
                  <tr key={k}>
                    <td className="font-semibold whitespace-nowrap">
                      {SENSORS[k].label} ({SENSORS[k].unit})
                    </td>
                    {(["min", "max"] as const).map((m) => (
                      <td key={m}>
                        <input
                          name={`${k}.${m}`}
                          type="number"
                          step="any"
                          className="inp w-28"
                          defaultValue={c.thresholds[k]?.[m]}
                          aria-label={`${SENSORS[k].label} ${m === "min" ? "minimum" : "maksimum"}`}
                          required
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label="Pompa mati otomatis setelah" hint="menit">
              <input name="pumpMaxMinutes" type="number" min={1} className="inp" defaultValue={c.pumpMaxMinutes} required />
            </Field>
            <Field label="Air tandon minimum untuk pompa" hint="%">
              <input name="minWaterForPump" type="number" min={0} max={100} className="inp" defaultValue={c.minWaterForPump} required />
            </Field>
            <Field label="Data dianggap usang setelah" hint="menit">
              <input name="staleMinutes" type="number" min={1} className="inp" defaultValue={c.staleMinutes} required />
            </Field>
          </div>
          <div className="mt-3">
            <ErrorNote>{error}</ErrorNote>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button type="submit">Simpan konfigurasi</Button>
            {saved && <span className="text-sm font-semibold text-daun">Konfigurasi tersimpan.</span>}
          </div>
        </form>
      </Card>

      <h2 className="mt-8 mb-3 font-extrabold text-daun-tua">Kategori produk</h2>
      <TableWrap>
        <table className="tbl">
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Kelompok</th>
              <th>Dipakai</th>
              <th>Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {d.categories.map((k) => {
              const dipakai = d.products.filter((p) => p.categoryId === k.id).length;
              return (
                <tr key={k.id}>
                  <td className="font-semibold">{k.name}</td>
                  <td>
                    <Badge tone={k.group === "KEBUN" ? "ok" : "info"}>{k.group === "KEBUN" ? "Hasil kebun" : "Produk UMKM"}</Badge>
                  </td>
                  <td className="tabular-nums">{dipakai} produk</td>
                  <td>
                    {dipakai > 0 ? (
                      <span className="text-redup">Masih dipakai</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          mutate((db) => {
                            db.categories = db.categories.filter((x) => x.id !== k.id);
                          })
                        }
                      >
                        Hapus
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
      <form onSubmit={tambahKategori} className="mt-3 grid max-w-2xl gap-3 sm:grid-cols-[1.5fr_1fr_auto]">
        <Field label="Nama kategori baru">
          <input name="name" className="inp" required />
        </Field>
        <Field label="Kelompok">
          <select name="group" className="inp">
            <option value="UMKM">Produk UMKM</option>
            <option value="KEBUN">Hasil kebun</option>
          </select>
        </Field>
        <div className="self-end">
          <Button type="submit" variant="secondary">
            Tambah kategori
          </Button>
        </div>
      </form>

      <Card className="mt-8 border-merah/30">
        <h2 className="font-extrabold text-merah">Kembalikan data contoh</h2>
        <p className="mt-1 max-w-[75ch] text-sm text-redup">
          Menghapus semua perubahan di browser ini (produk, pesanan, penjualan, pembacaan sensor, akun) dan mengisinya
          lagi dengan data contoh awal. Anda akan keluar dari dashboard.
        </p>
        <div className="mt-3">
          <Button variant="danger" onClick={() => confirm("Hapus semua perubahan dan kembali ke data contoh awal?") && resetDb()}>
            Kembalikan data contoh
          </Button>
        </div>
      </Card>
    </>
  );
}
