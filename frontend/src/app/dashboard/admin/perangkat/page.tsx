"use client";
import type { FormEvent } from "react";
import { Button, Card, Empty, ErrorNote, Field, PageHead, Status, TableWrap } from "@/components/ui";
import { lalu } from "@/lib/format";
import { SENSORS, SENSOR_KEYS, uid } from "@/lib/logic";
import { formData, mutate, useDb, useNow, useTry } from "@/lib/store";
import type { Device, SensorKey } from "@/lib/types";

export default function Perangkat() {
  const d = useDb();
  const now = useNow(30000);
  const [error, run] = useTry();
  const ubah = (id: string, fn: (dev: Device) => void) => mutate((db) => fn(db.devices.find((x) => x.id === id)!));

  function tambahZona(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = formData(e);
    e.currentTarget.reset();
    mutate((db) => {
      db.zones.push({ id: uid("Z"), name: f.name.trim(), description: f.description.trim() });
    });
  }

  function tambahPerangkat(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = formData(e);
    const form = e.currentTarget;
    const ok = run(() =>
      mutate((db) => {
        const id = f.id.trim().toUpperCase();
        if (db.devices.some((x) => x.id === id)) throw new Error(`ID perangkat ${id} sudah terdaftar.`);
        db.devices.push({
          id,
          zoneId: f.zoneId,
          type: f.type.trim(),
          status: "OFFLINE",
          sensors: ["temperature", "humidity", "waterLevel"],
          failedSensors: [],
          lastSeen: null,
          hasPump: false,
          pumpOnSince: null,
          buffer: [],
        });
      }),
    );
    if (ok) form.reset();
  }

  return (
    <>
      <PageHead
        title="Perangkat"
        desc="Daftar node IoT di greenhouse. Centang hanya sensor yang benar-benar dipasang; sensor yang tidak dicentang tidak dianggap rusak."
      />

      <Card className="mb-6">
        <h2 className="font-extrabold text-daun-tua">Area kebun</h2>
        <ul className="mt-2 text-sm">
          {d.zones.map((z) => (
            <li key={z.id}>
              <span className="font-semibold">{z.name}</span>
              {z.description && <span className="text-redup">, {z.description}</span>}
            </li>
          ))}
        </ul>
        <form onSubmit={tambahZona} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
          <Field label="Nama area">
            <input name="name" className="inp" required />
          </Field>
          <Field label="Keterangan" hint="opsional">
            <input name="description" className="inp" />
          </Field>
          <div className="self-end">
            <Button type="submit" variant="secondary">
              Tambah area
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mb-6">
        <h2 className="font-extrabold text-daun-tua">Daftarkan perangkat</h2>
        <form onSubmit={tambahPerangkat} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr_1.2fr_auto]">
          <Field label="ID perangkat">
            <input name="id" className="inp" placeholder="SG-KWT-002" required />
          </Field>
          <Field label="Area kebun">
            <select name="zoneId" className="inp" required>
              {d.zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Jenis perangkat">
            <input name="type" className="inp" defaultValue="ESP32 Smart Garden Node" required />
          </Field>
          <div className="self-end">
            <Button type="submit">Daftarkan</Button>
          </div>
        </form>
        <p className="mt-3 text-sm text-redup">
          Token khusus perangkat untuk mengirim data akan dibuat oleh backend saat sistem sudah tersambung ke server.
        </p>
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      </Card>

      {d.devices.length === 0 ? (
        <Empty>Belum ada perangkat terdaftar.</Empty>
      ) : (
        <TableWrap>
          <table className="tbl">
            <thead>
              <tr>
                <th>Perangkat</th>
                <th>Status</th>
                <th>Sensor terpasang</th>
                <th>Pompa</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {d.devices.map((dev) => (
                <tr key={dev.id}>
                  <td>
                    <span className="font-semibold">{dev.id}</span>
                    <span className="block text-redup">{dev.type}</span>
                    <span className="block text-redup">{d.zones.find((z) => z.id === dev.zoneId)?.name}</span>
                  </td>
                  <td>
                    <Status value={dev.status} />
                    <span className="mt-1 block whitespace-nowrap text-redup">
                      {dev.lastSeen ? `Data terakhir ${lalu(dev.lastSeen, now)}` : "Belum pernah mengirim data"}
                    </span>
                  </td>
                  <td>
                    <div className="grid min-w-64 grid-cols-2 gap-x-3 gap-y-1">
                      {SENSOR_KEYS.map((k: SensorKey) => (
                        <label key={k} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="size-4 accent-daun"
                            checked={dev.sensors.includes(k)}
                            onChange={(e) =>
                              ubah(dev.id, (x) => {
                                x.sensors = SENSOR_KEYS.filter((s) => (s === k ? e.target.checked : x.sensors.includes(s)));
                                x.failedSensors = x.failedSensors.filter((s) => x.sensors.includes(s));
                              })
                            }
                          />
                          {SENSORS[k].label}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td>
                    <label className="flex items-center gap-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="size-4 accent-daun"
                        checked={dev.hasPump}
                        disabled={!!dev.pumpOnSince}
                        onChange={(e) => ubah(dev.id, (x) => void (x.hasPump = e.target.checked))}
                      />
                      Ada pompa
                    </label>
                  </td>
                  <td>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        confirm(`Hapus perangkat ${dev.id} beserta riwayat pembacaannya?`) &&
                        mutate((db) => {
                          db.devices = db.devices.filter((x) => x.id !== dev.id);
                          db.readings = db.readings.filter((r) => r.deviceId !== dev.id);
                        })
                      }
                    >
                      Hapus
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </>
  );
}
