"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { Button, Card, Empty, ErrorNote, Field, PageHead, Status } from "@/components/ui";
import { tgl } from "@/lib/format";
import { approveHarvest, dayKey, harvestToCatalog, isKwtAdmin, recordHarvest, submitHarvest } from "@/lib/logic";
import { formData, mutate, nowIso, useDb, useNow, useTry, useUser } from "@/lib/store";

export default function Panen() {
  const d = useDb();
  const user = useUser()!;
  const router = useRouter();
  const [error, run] = useTry();
  const hariIni = dayKey(useNow(600000));
  const admin = isKwtAdmin(user.role);
  const kwt = d.producers.find((p) => p.type === "KWT");
  const produkKwt = d.products.filter((p) => p.producerId === kwt?.id);
  const batch = (id: string) => d.batches.find((b) => b.id === id);
  const harvests = [...d.harvests].sort((a, b) => b.harvestDate.localeCompare(a.harvestDate));

  function catat(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = formData(e);
    const form = e.currentTarget;
    const ok = run(() =>
      mutate((db) =>
        recordHarvest(db, {
          batchId: f.batchId,
          harvestDate: f.harvestDate,
          quantity: Number(f.quantity),
          unit: f.unit,
          qualityNote: f.qualityNote,
          closeBatch: f.closeBatch === "on",
        }),
      ),
    );
    if (ok) form.reset();
  }

  function verifikasi(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const f = formData(e);
    run(() => mutate((db) => approveHarvest(db, id, Number(f.available))));
  }

  function keKatalog(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const f = formData(e);
    run(() => {
      if (!kwt) throw new Error("Belum ada produsen bertipe KWT. Tambahkan dulu di menu Produsen.");
      const pid = mutate((db) => harvestToCatalog(db, id, kwt.id, nowIso(), f.target || undefined));
      router.push(`/dashboard/produk?edit=${pid}`);
    });
  }

  return (
    <>
      <PageHead
        title="Panen"
        desc="Hasil panen baru muncul di katalog setelah diverifikasi Admin KWT. Yang belum diverifikasi tidak pernah tampil ke pembeli."
      />

      <Card className="mb-6">
        <h2 className="font-extrabold text-daun-tua">Catat panen</h2>
        {d.batches.length === 0 ? (
          <p className="mt-2 text-redup">
            Belum ada batch tanaman.{" "}
            <Link href="/dashboard/kebun/budidaya" className="font-semibold text-daun underline">
              Buat batch dulu
            </Link>
          </p>
        ) : (
          <form onSubmit={catat} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Batch tanaman" className="lg:col-span-2">
              <select name="batchId" className="inp" required>
                {[...d.batches]
                  .sort((a, b) => Number(b.active) - Number(a.active))
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.cropName}, tanam {tgl(b.plantingDate)}
                      {b.active ? "" : " (selesai)"}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Tanggal panen">
              <input name="harvestDate" type="date" className="inp" defaultValue={hariIni} max={hariIni} required />
            </Field>
            <div className="grid grid-cols-[1fr_5rem] gap-2">
              <Field label="Jumlah">
                <input name="quantity" type="number" min={0.1} step="any" className="inp" required />
              </Field>
              <Field label="Satuan">
                <input name="unit" className="inp" defaultValue="kg" required />
              </Field>
            </div>
            <Field label="Catatan kondisi hasil" className="sm:col-span-2 lg:col-span-3">
              <input name="qualityNote" className="inp" placeholder="Misalnya: sebagian daun berlubang" />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
              <input type="checkbox" name="closeBatch" className="size-4 accent-daun" />
              Panen terakhir batch ini
            </label>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit">Simpan catatan panen</Button>
            </div>
          </form>
        )}
      </Card>

      <div className="mb-3">
        <ErrorNote>{error}</ErrorNote>
      </div>

      {harvests.length === 0 ? (
        <Empty>Belum ada catatan panen.</Empty>
      ) : (
        <ul className="space-y-3">
              {harvests.map((h) => (
                <li key={h.id} className="rounded-lg border border-garis bg-white p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-bold">{batch(h.batchId)?.cropName ?? "Tanpa batch"}</span>
                    <Status value={h.status} />
                    <span className="text-sm text-redup">Panen {tgl(h.harvestDate)}</span>
                  </div>
                  <p className="mt-2 tabular-nums">
                    Dipanen {h.quantity} {h.unit}
                    {h.availableQuantity != null && `, layak jual ${h.availableQuantity} ${h.unit}`}
                  </p>
                  {h.qualityNote && <p className="text-sm text-redup">{h.qualityNote}</p>}
                  <div className="mt-3 border-t border-garis/60 pt-3 text-sm">
                    {h.status === "HARVESTED" && (
                      <Button size="sm" variant="secondary" onClick={() => run(() => mutate((db) => submitHarvest(db, h.id)))}>
                        Ajukan verifikasi
                      </Button>
                    )}
                    {h.status === "PENDING_REVIEW" &&
                      (admin ? (
                        <form onSubmit={(e) => verifikasi(e, h.id)} className="flex flex-wrap items-end gap-2">
                          <Field label={`Layak jual (${h.unit})`}>
                            <input name="available" type="number" min={0} max={h.quantity} step="any" defaultValue={h.quantity} className="inp w-28" required />
                          </Field>
                          <Button type="submit" size="sm">
                            Verifikasi
                          </Button>
                        </form>
                      ) : (
                        <span className="text-redup">Menunggu Admin KWT</span>
                      ))}
                    {h.status === "APPROVED" &&
                      (h.productId ? (
                        <Link href={`/dashboard/produk?edit=${h.productId}`} className="font-semibold text-daun underline">
                          Lengkapi dan terbitkan produk
                        </Link>
                      ) : !h.availableQuantity ? (
                        <span className="text-redup">Tidak ada yang layak jual</span>
                      ) : admin ? (
                        <form onSubmit={(e) => keKatalog(e, h.id)} className="flex flex-wrap items-end gap-2">
                          <Field label="Masukkan ke">
                            <select name="target" className="inp w-48">
                              <option value="">Produk baru (draf)</option>
                              {produkKwt.map((p) => (
                                <option key={p.id} value={p.id}>
                                  Tambah stok {p.name}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Button type="submit" size="sm">
                            Masukkan ke katalog
                          </Button>
                        </form>
                      ) : (
                        <span className="text-redup">Menunggu Admin KWT memasukkan ke katalog</span>
                      ))}
                    {h.status === "PUBLISHED" && h.productId && (
                      <Link href={`/produk/${h.productId}`} className="font-semibold text-daun underline">
                        Lihat di katalog
                      </Link>
                    )}
                  </div>
                </li>
              ))}
        </ul>
      )}
    </>
  );
}
