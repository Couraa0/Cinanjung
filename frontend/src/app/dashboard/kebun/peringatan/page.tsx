"use client";
import { Badge, Button, Empty, PageHead } from "@/components/ui";
import { tglJam } from "@/lib/format";
import { SENSORS } from "@/lib/logic";
import { mutate, useDb } from "@/lib/store";

export default function Peringatan() {
  const d = useDb();
  const alerts = [...d.alerts].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 100);
  const baru = d.alerts.filter((a) => !a.read).length;

  return (
    <>
      <PageHead
        title="Peringatan"
        desc="Muncul saat pembacaan sensor keluar dari ambang, sensor gagal membaca, atau pompa dimatikan pengaman."
        action={
          baru > 0 && (
            <Button
              variant="secondary"
              onClick={() =>
                mutate((db) => {
                  for (const a of db.alerts) a.read = true;
                })
              }
            >
              Tandai {baru} sudah dibaca
            </Button>
          )
        }
      />

      {alerts.length === 0 ? (
        <Empty>Belum ada peringatan. Semua pembacaan masih di dalam ambang.</Empty>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-garis bg-white">
          {alerts.map((a) => (
            <li key={a.id} className={`flex flex-wrap items-start gap-x-4 gap-y-1 border-b border-garis/60 px-4 py-3 last:border-0 ${a.read ? "" : "bg-pepaya-muda/50"}`}>
              <div className="min-w-0 flex-1">
                <p className={a.read ? "" : "font-semibold"}>{a.message}</p>
                <p className="text-sm text-redup">
                  {tglJam(a.timestamp)}, perangkat {a.deviceId}
                </p>
              </div>
              <Badge tone={a.parameter === "pump" ? "info" : "warn"}>{a.parameter === "pump" ? "Pompa" : SENSORS[a.parameter].label}</Badge>
              {!a.read && <Badge tone="bad">Baru</Badge>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
