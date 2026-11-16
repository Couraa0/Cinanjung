"use client";
import { useState } from "react";
import { Button, Empty, ErrorNote, PageHead, Status } from "@/components/ui";
import { tglJam } from "@/lib/format";
import { NEXT_STATUS, owns, rupiah, setOrderStatus } from "@/lib/logic";
import { mutate, nowIso, useDb, useTry, useUser } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";

const TAB: [string, OrderStatus[]][] = [
  ["Perlu konfirmasi", ["INQUIRY", "PENDING_CONFIRMATION"]],
  ["Berjalan", ["CONFIRMED", "PROCESSING"]],
  ["Riwayat", ["COMPLETED", "CANCELLED"]],
];
// Nama tombol untuk memindahkan pesanan KE status tersebut.
const AKSI: Partial<Record<OrderStatus, string>> = {
  PENDING_CONFIRMATION: "Pesan WhatsApp sudah masuk",
  CONFIRMED: "Setujui pesanan",
  PROCESSING: "Mulai proses",
  COMPLETED: "Selesai, catat penjualan",
  CANCELLED: "Batalkan",
};

export default function Pesanan() {
  const d = useDb();
  const user = useUser()!;
  const [tab, setTab] = useState(0);
  const [error, run] = useTry();
  const mine = d.orders.filter((o) => owns(user, o.producerId));
  const orders = mine.filter((o) => TAB[tab][1].includes(o.status)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const ubah = (id: string, next: OrderStatus) => {
    if (next === "CANCELLED" && !confirm("Batalkan pesanan ini? Stok yang sudah dialokasikan akan dikembalikan.")) return;
    run(() => mutate((db) => setOrderStatus(db, id, next, nowIso())));
  };

  return (
    <>
      <PageHead
        title="Pesanan"
        desc="Pesanan masuk lewat WhatsApp. Stok baru berkurang saat Anda menyetujui pesanan, dan pembayaran dipastikan langsung dengan pembeli."
      />

      <div className="mb-4 flex flex-wrap gap-1 rounded-md border border-garis bg-white p-1" role="group" aria-label="Kelompok pesanan">
        {TAB.map(([label, statuses], i) => (
          <button
            key={label}
            type="button"
            aria-pressed={tab === i}
            onClick={() => setTab(i)}
            className={`rounded px-3 py-1.5 text-sm font-semibold ${tab === i ? "bg-daun text-white" : "hover:bg-daun-muda"}`}
          >
            {label} ({mine.filter((o) => statuses.includes(o.status)).length})
          </button>
        ))}
      </div>

      <div className="mb-3">
        <ErrorNote>{error}</ErrorNote>
      </div>

      {orders.length === 0 && <Empty>Tidak ada pesanan di kelompok ini.</Empty>}

      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="rounded-lg border border-garis bg-white p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-bold">{o.id}</span>
              <Status value={o.status} />
              <span className="text-sm text-redup">{tglJam(o.createdAt)}</span>
              {user.role === "SUPER_ADMIN" && (
                <span className="text-sm text-redup">{d.producers.find((p) => p.id === o.producerId)?.name}</span>
              )}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm text-redup">Pemesan</p>
                <p className="font-semibold">{o.customerName}</p>
                <p className="text-sm">{o.customerAddress}</p>
              </div>
              <div>
                <p className="text-sm text-redup">Pesanan</p>
                {o.items.map((i) => (
                  <p key={i.productId}>
                    {i.name}, {i.qty} {i.unit} × {rupiah(i.price)}
                  </p>
                ))}
                <p className="font-bold tabular-nums">Total {rupiah(o.total)}</p>
              </div>
            </div>
            {NEXT_STATUS[o.status].length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-garis/60 pt-3">
                {NEXT_STATUS[o.status].map((next) => (
                  <Button
                    key={next}
                    size="sm"
                    variant={next === "CANCELLED" ? "danger" : next === "PENDING_CONFIRMATION" ? "secondary" : "primary"}
                    onClick={() => ubah(o.id, next)}
                  >
                    {AKSI[next]}
                  </Button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
