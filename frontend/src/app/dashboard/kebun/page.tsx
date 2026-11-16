"use client";
import { useEffect, useState } from "react";
import { LineChart } from "@/components/chart";
import { Badge, Button, Card, Empty, ErrorNote, PageHead, Status, TableWrap } from "@/components/ui";
import { durasi, jam, lalu, tglJam } from "@/lib/format";
import { LABEL, SENSORS, SENSOR_KEYS, isKwtAdmin, latestReading, pumpOff, pumpOn, simulateTick, type Scenario } from "@/lib/logic";
import { mutate, nowIso, useDb, useNow, useTry, useUser } from "@/lib/store";
import type { Db, Device, Reading, SensorKey } from "@/lib/types";

const SKENARIO: [Scenario, string][] = [
  ["NORMAL", "Normal"],
  ["AIR_RENDAH", "Air tandon rendah"],
  ["SENSOR_RUSAK", "Sensor suhu rusak"],
  ["WIFI_PUTUS", "Wi-Fi putus"],
];

export default function Pemantauan() {
  const d = useDb();
  const user = useUser()!;
  const now = useNow(5000);
  const [deviceId, setDeviceId] = useState(d.devices[0]?.id ?? "");
  const [param, setParam] = useState<SensorKey>("temperature");
  const [hours, setHours] = useState(24);
  const [scenario, setScenario] = useState<Scenario>("NORMAL");
  const [auto, setAuto] = useState(true);
  const [error, run] = useTry();

  // Simulasi pengganti ESP32: satu pembacaan baru tiap 15 detik selama halaman ini terbuka.
  useEffect(() => {
    if (!auto || !deviceId) return;
    const t = setInterval(() => mutate((db) => simulateTick(db, deviceId, scenario, Date.now())), 15000);
    return () => clearInterval(t);
  }, [auto, deviceId, scenario]);

  const dev = d.devices.find((x) => x.id === deviceId);
  if (!dev) return <Empty>Belum ada perangkat terdaftar. Super Admin bisa mendaftarkannya di menu Perangkat.</Empty>;

  const last = latestReading(d, dev.id);
  const rows = d.readings.filter((r) => r.deviceId === dev.id);
  const chart = rows.filter((r) => Date.parse(r.timestamp) >= now - hours * 3600e3);
  const shownParam = dev.sensors.includes(param) ? param : dev.sensors[0];
  const pumpSec = dev.pumpOnSince ? Math.max(0, Math.round((now - Date.parse(dev.pumpOnSince)) / 1000)) : 0;
  const logs = d.irrigationLogs.filter((l) => l.deviceId === dev.id).slice(-5).reverse();

  return (
    <>
      <PageHead
        title="Pemantauan greenhouse"
        desc={d.zones.find((z) => z.id === dev.zoneId)?.name}
        action={
          d.devices.length > 1 && (
            <select className="inp max-w-56" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} aria-label="Perangkat">
              {d.devices.map((x) => (
                <option key={x.id}>{x.id}</option>
              ))}
            </select>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-bold">{dev.id}</span>
        <Status value={dev.status} />
        <span className="text-redup">{dev.lastSeen ? `Data terakhir ${lalu(dev.lastSeen, now)}` : "Belum pernah mengirim data"}</span>
        <Badge tone="info">Data simulasi</Badge>
        {dev.buffer.length > 0 && <Badge tone="warn">{dev.buffer.length} pembacaan tertahan di perangkat</Badge>}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SENSOR_KEYS.map((k) => (
          <SensorTile key={k} k={k} d={d} dev={dev} last={last} now={now} />
        ))}
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-extrabold text-daun-tua">Riwayat</h2>
          <div className="flex flex-wrap gap-2">
            <select className="inp w-auto" value={shownParam} onChange={(e) => setParam(e.target.value as SensorKey)} aria-label="Parameter">
              {dev.sensors.map((k) => (
                <option key={k} value={k}>
                  {SENSORS[k].label} ({SENSORS[k].unit})
                </option>
              ))}
            </select>
            <select className="inp w-auto" value={hours} onChange={(e) => setHours(Number(e.target.value))} aria-label="Rentang waktu">
              <option value={6}>6 jam terakhir</option>
              <option value={24}>24 jam terakhir</option>
              <option value={72}>3 hari terakhir</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          {shownParam && (
            <LineChart
              points={chart.map((r) => ({ t: Date.parse(r.timestamp), v: r[shownParam] }))}
              unit={SENSORS[shownParam].unit}
              band={d.config.thresholds[shownParam]}
            />
          )}
        </div>
        <p className="mt-2 text-sm text-redup">Bidang hijau menandai ambang yang diatur admin. Celah pada garis berarti sensor tidak terbaca.</p>
      </Card>

      <h2 className="mt-8 mb-3 font-extrabold text-daun-tua">Pembacaan terbaru</h2>
      <TableWrap>
        <table className="tbl">
          <thead>
            <tr>
              <th>Waktu</th>
              {dev.sensors.map((k) => (
                <th key={k}>
                  {SENSORS[k].label} ({SENSORS[k].unit})
                </th>
              ))}
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .slice(-8)
              .reverse()
              .map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{tglJam(r.timestamp)}</td>
                  {dev.sensors.map((k) => (
                    <td key={k} className="tabular-nums">
                      {r[k] ?? <span className="text-merah">tidak terbaca</span>}
                    </td>
                  ))}
                  <td>{r.late && <Badge tone="warn">Terlambat masuk</Badge>}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </TableWrap>

      {dev.hasPump && (
        <Card className="mt-8">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-extrabold text-daun-tua">Pompa</h2>
            {dev.pumpOnSince ? <Badge tone="info">Menyala</Badge> : <Badge>Mati</Badge>}
          </div>
          <p className="mt-2 text-redup">
            {dev.pumpOnSince
              ? `Menyala sejak ${jam(dev.pumpOnSince)}, sudah ${durasi(pumpSec)} dari batas ${d.config.pumpMaxMinutes} menit.`
              : `Pompa tidak akan menyala kalau air tandon di bawah ${d.config.minWaterForPump}%, dan mati sendiri setelah ${d.config.pumpMaxMinutes} menit.`}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {!isKwtAdmin(user.role) ? (
              <p className="text-sm text-redup">Pompa hanya bisa dikontrol oleh Admin KWT.</p>
            ) : dev.pumpOnSince ? (
              <Button variant="danger" onClick={() => run(() => mutate((db) => pumpOff(db, dev.id, nowIso())))}>
                Matikan pompa
              </Button>
            ) : (
              <Button onClick={() => run(() => mutate((db) => pumpOn(db, dev.id, nowIso())))}>Nyalakan pompa</Button>
            )}
          </div>
          <div className="mt-3">
            <ErrorNote>{error}</ErrorNote>
          </div>
          {logs.length > 0 && (
            <ul className="mt-4 divide-y divide-garis/60 border-t border-garis text-sm">
              {logs.map((l) => (
                <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    {tglJam(l.startedAt)}, {durasi(l.durationSec)}
                  </span>
                  <span className="text-redup">{LABEL[l.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <details className="mt-8 rounded-lg border border-dashed border-telang/50 bg-telang-muda/40 p-5">
        <summary className="cursor-pointer font-bold text-telang">Simulasi perangkat (untuk demo)</summary>
        <p className="mt-2 max-w-[70ch] text-sm text-redup">
          Belum ada ESP32 yang tersambung, jadi angka di halaman ini dibuat oleh simulasi dan bukan hasil pengukuran
          greenhouse. Pilih skenario untuk melihat reaksi sistem.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SKENARIO.map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={scenario === v}
              onClick={() => setScenario(v)}
              className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${
                scenario === v ? "border-telang bg-telang text-white" : "border-garis bg-white hover:border-telang"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Button variant="secondary" size="sm" onClick={() => mutate((db) => simulateTick(db, dev.id, scenario, Date.now()))}>
            Kirim satu pembacaan sekarang
          </Button>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="size-4 accent-telang" />
            Kirim otomatis tiap 15 detik
          </label>
        </div>
      </details>
    </>
  );
}

function SensorTile({ k, d, dev, last, now }: { k: SensorKey; d: Db; dev: Device; last?: Reading; now: number }) {
  const s = SENSORS[k];
  if (!dev.sensors.includes(k))
    return (
      <div className="rounded-lg border border-dashed border-garis p-4 text-redup">
        <p className="text-sm font-semibold">{s.label}</p>
        <p className="mt-2 text-sm">Sensor belum dipasang</p>
      </div>
    );

  const v = last?.[k] ?? null;
  const t = d.config.thresholds[k];
  const out = v != null && !!t && (v < t.min || v > t.max);
  const stale = !last || now - Date.parse(last.timestamp) > d.config.staleMinutes * 60000;
  // Indikator kualitas data: angka tanpa konteks bisa menyesatkan pengelola.
  const quality = dev.failedSensors.includes(k)
    ? (["bad", "Sensor error"] as const)
    : dev.status === "OFFLINE"
      ? (["muted", "Perangkat offline"] as const)
      : stale
        ? (["warn", "Data usang"] as const)
        : (["ok", "Data baik"] as const);

  return (
    <div className={`rounded-lg border bg-white p-4 ${out ? "border-pepaya" : "border-garis"}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-redup">{s.label}</p>
        <Badge tone={quality[0]}>{quality[1]}</Badge>
      </div>
      <p className="mt-2 text-4xl font-extrabold tabular-nums text-daun-tua">
        {v ?? "–"}
        <span className="ml-1 text-lg font-semibold text-redup">{s.unit}</span>
      </p>
      <p className="mt-1 text-sm text-redup">{last ? `Dibaca ${jam(last.timestamp)} (${lalu(last.timestamp, now)})` : "Belum ada pembacaan"}</p>
      {t && (
        <p className={`mt-1 text-sm ${out ? "font-semibold text-pepaya-tua" : "text-redup"}`}>
          {out ? "Di luar ambang" : "Ambang"} {t.min}–{t.max} {s.unit}
        </p>
      )}
    </div>
  );
}
