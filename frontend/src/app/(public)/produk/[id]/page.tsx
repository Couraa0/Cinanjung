"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ProductImage, groupOf } from "@/components/product";
import { Badge, Button, Empty, ErrorNote, Field, btn } from "@/components/ui";
import { createOrder, productStatus, rupiah, waLink, waMessage } from "@/lib/logic";
import { formData, mutate, nowIso, useDb, useTry } from "@/lib/store";
import type { Order } from "@/lib/types";

export default function DetailProduk() {
  const { id } = useParams<{ id: string }>();
  const d = useDb();
  const [qty, setQty] = useState(1);
  const [pesanan, setPesanan] = useState<Order | null>(null);
  const [error, run] = useTry();

  const p = d.products.find((x) => x.id === id);
  const producer = d.producers.find((x) => x.id === p?.producerId);
  if (!p || !producer || p.status !== "PUBLISHED")
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Empty>
          Produk ini tidak ditemukan atau sedang tidak dijual.{" "}
          <Link href="/katalog" className="font-semibold text-daun underline">
            Kembali ke katalog
          </Link>
        </Empty>
      </div>
    );

  const habis = productStatus(p) === "OUT_OF_STOCK";
  const legal = [
    ["NIB", producer.nib],
    ["PIRT", producer.pirt],
    ["Halal", producer.halal],
  ].filter(([, v]) => v);

  function pesan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = formData(e);
    run(() => {
      const o = mutate((db) =>
        createOrder(db, { productId: p!.id, qty, customerName: f.nama, customerAddress: f.alamat }, nowIso()),
      );
      setPesanan(o);
      window.open(waLink(producer!.whatsapp, waMessage(o)), "_blank", "noopener");
    });
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-2">
      <ProductImage p={p} group={groupOf(d, p)} className="aspect-[4/3] w-full rounded-xl text-3xl" />

      <div>
        <p className="text-sm text-redup">{d.categories.find((c) => c.id === p.categoryId)?.name}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-daun-tua">{p.name}</h1>
        <p className="mt-3 text-2xl font-extrabold tabular-nums">
          {rupiah(p.price)}
          <span className="text-base font-medium text-redup">/{p.unit}</span>
        </p>
        <p className="mt-2">
          {habis ? <Badge tone="warn">Stok habis</Badge> : <Badge tone="ok">Stok {p.stock} {p.unit}</Badge>}
        </p>
        {p.description && <p className="mt-4 max-w-[60ch] text-redup">{p.description}</p>}

        <div className="mt-5 rounded-lg border border-garis bg-white p-4">
          <p className="text-sm text-redup">Dijual oleh</p>
          <Link href={`/produsen/${producer.id}`} className="font-bold text-daun underline underline-offset-4">
            {producer.name}
          </Link>
          <p className="mt-1 text-sm text-redup">{producer.location}</p>
          {legal.length > 0 && (
            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {legal.map(([k, v]) => (
                <div key={k} className="flex gap-1.5">
                  <dt className="font-semibold">{k}</dt>
                  <dd className="text-redup">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {pesanan ? (
          <div className="mt-6 rounded-lg border border-daun bg-daun-muda p-5">
            <h2 className="font-extrabold text-daun-tua">Permintaan {pesanan.id} dicatat</h2>
            <p className="mt-1 text-sm">
              Kirim pesan di WhatsApp supaya penjual menerimanya. Pesanan baru jadi setelah penjual mengonfirmasi stok dan
              pembayaran.
            </p>
            <pre className="mt-3 rounded-md bg-white p-3 font-sans text-sm whitespace-pre-wrap">{waMessage(pesanan)}</pre>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={waLink(producer.whatsapp, waMessage(pesanan))}
                target="_blank"
                rel="noopener noreferrer"
                className={btn("wa")}
              >
                Buka WhatsApp lagi
              </a>
              <Button variant="secondary" onClick={() => setPesanan(null)}>
                Pesan lagi
              </Button>
            </div>
          </div>
        ) : habis ? (
          <p className="mt-6 rounded-lg border border-dashed border-garis p-4 text-redup">
            Stok sedang habis. Produsen akan memperbarui stok setelah produksi atau panen berikutnya.
          </p>
        ) : (
          <form onSubmit={pesan} className="mt-6 space-y-4">
            <h2 className="text-lg font-extrabold text-daun-tua">Pesan produk ini</h2>
            <Field label={`Jumlah (${p.unit})`} hint={`maksimal ${p.stock}`}>
              <input
                type="number"
                className="inp max-w-40"
                min={p.unit === "kg" ? 0.5 : 1}
                step={p.unit === "kg" ? 0.5 : 1}
                max={p.stock}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                required
              />
            </Field>
            <Field label="Nama pemesan">
              <input name="nama" className="inp" autoComplete="name" required />
            </Field>
            <Field label="Alamat" hint="untuk pengiriman atau janji ambil">
              <textarea name="alamat" className="inp" rows={2} autoComplete="street-address" required />
            </Field>
            <p className="text-lg font-bold tabular-nums">Total estimasi {rupiah(p.price * (qty || 0))}</p>
            <ErrorNote>{error}</ErrorNote>
            <button type="submit" className={`w-full sm:w-auto ${btn("wa", "lg")}`}>
              Pesan lewat WhatsApp
            </button>
            <p className="text-sm text-redup">
              Tombol ini membuka WhatsApp dengan pesan yang sudah tersusun. Stok dan pembayaran dikonfirmasi penjual.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
