"use client";
import type { FormEvent } from "react";
import { Badge, Button, Card, Empty, ErrorNote, Field, PageHead } from "@/components/ui";
import { tgl } from "@/lib/format";
import { dayKey, isKwtAdmin, uid } from "@/lib/logic";
import { formData, mutate, useDb, useNow, useTry, useUser } from "@/lib/store";

const JENIS = ["Penanaman", "Penambahan nutrisi", "Penggantian air", "Pemeliharaan", "Pengamatan pertumbuhan", "Lainnya"];

export default function Budidaya() {
  const d = useDb();
  const user = useUser()!;
  const now = useNow(600000);
  const [error, run] = useTry();
  const admin = isKwtAdmin(user.role);
  const hariIni = dayKey(now);
  const batches = [...d.batches].sort((a, b) => Number(b.active) - Number(a.active) || b.plantingDate.localeCompare(a.plantingDate));

  function tambahBatch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = formData(e);
    const form = e.currentTarget;
    const ok = run(() =>
      mutate((db) => {
        if (!(Number(f.seedCount) > 0)) throw new Error("Jumlah bibit harus lebih dari 0.");
        db.batches.push({
          id: uid("B"),
          zoneId: f.zoneId,
          cropName: f.cropName.trim(),
          plantingDate: f.plantingDate,
          seedCount: Number(f.seedCount),
          medium: f.medium.trim(),
          active: true,
        });
      }),
    );
    if (ok) form.reset();
  }

  function tambahCatatan(e: FormEvent<HTMLFormElement>, batchId: string) {
    e.preventDefault();
    const f = formData(e);
    e.currentTarget.reset();
    mutate((db) => {
      db.activities.push({ id: uid("A"), batchId, date: f.date, type: f.type, note: f.note.trim() });
    });
  }

  return (
    <>
      <PageHead
        title="Budidaya"
        desc="Sensor hanya mengukur kondisi. Penanaman, pemberian nutrisi, dan pemeliharaan tetap dicatat di sini per batch tanaman."
      />

      {admin && d.zones.length > 0 && (
        <Card className="mb-6">
          <h2 className="font-extrabold text-daun-tua">Mulai batch baru</h2>
          <form onSubmit={tambahBatch} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Tanaman">
              <input name="cropName" className="inp" placeholder="Pakcoy" required />
            </Field>
            <Field label="Lokasi">
              <select name="zoneId" className="inp" required>
                {d.zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tanggal tanam">
              <input name="plantingDate" type="date" className="inp" defaultValue={hariIni} max={hariIni} required />
            </Field>
            <Field label="Jumlah bibit">
              <input name="seedCount" type="number" min={1} className="inp" required />
            </Field>
            <Field label="Media tanam">
              <input name="medium" className="inp" placeholder="Rockwool" required />
            </Field>
            <div className="self-end">
              <Button type="submit">Simpan batch</Button>
            </div>
          </form>
          <div className="mt-3">
            <ErrorNote>{error}</ErrorNote>
          </div>
        </Card>
      )}

      {batches.length === 0 && <Empty>Belum ada batch tanaman. Admin KWT bisa memulai batch pertama di atas.</Empty>}

      <div className="space-y-3">
        {batches.map((b) => {
          const catatan = d.activities.filter((a) => a.batchId === b.id).sort((x, y) => y.date.localeCompare(x.date));
          const hari = Math.max(0, Math.floor((now - Date.parse(b.plantingDate)) / 86400e3));
          return (
            <details key={b.id} className="rounded-lg border border-garis bg-white" open={b.active}>
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 p-4">
                <span className="font-bold">{b.cropName}</span>
                {b.active ? <Badge tone="ok">Aktif, hari ke-{hari}</Badge> : <Badge>Selesai</Badge>}
                <span className="text-sm text-redup">
                  Tanam {tgl(b.plantingDate)}, {b.seedCount} bibit, {b.medium}, {d.zones.find((z) => z.id === b.zoneId)?.name}
                </span>
              </summary>
              <div className="border-t border-garis p-4">
                {catatan.length === 0 ? (
                  <p className="text-sm text-redup">Belum ada catatan untuk batch ini.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {catatan.map((a) => (
                      <li key={a.id} className="grid gap-x-4 sm:grid-cols-[7rem_11rem_1fr]">
                        <span className="text-redup">{tgl(a.date)}</span>
                        <span className="font-semibold">{a.type}</span>
                        <span>{a.note}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {b.active && (
                  <form onSubmit={(e) => tambahCatatan(e, b.id)} className="mt-4 grid gap-3 border-t border-garis/60 pt-4 sm:grid-cols-[9rem_12rem_1fr_auto]">
                    <Field label="Tanggal">
                      <input name="date" type="date" className="inp" defaultValue={hariIni} max={hariIni} required />
                    </Field>
                    <Field label="Kegiatan">
                      <select name="type" className="inp">
                        {JENIS.map((j) => (
                          <option key={j}>{j}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Catatan">
                      <input name="note" className="inp" placeholder="Misalnya: tambah nutrisi 2 liter" required />
                    </Field>
                    <div className="self-end">
                      <Button type="submit" variant="secondary">
                        Catat
                      </Button>
                    </div>
                  </form>
                )}

                {admin && (
                  <div className="mt-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        mutate((db) => {
                          const x = db.batches.find((y) => y.id === b.id);
                          if (x) x.active = !x.active;
                        })
                      }
                    >
                      {b.active ? "Tandai batch selesai" : "Aktifkan lagi"}
                    </Button>
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}
