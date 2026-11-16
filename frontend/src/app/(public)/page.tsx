"use client";
import Link from "next/link";
import { ProductCard, groupOf } from "@/components/product";
import { Badge, btn } from "@/components/ui";
import { tgl } from "@/lib/format";
import { LABEL, rupiah } from "@/lib/logic";
import { useDb, useNow } from "@/lib/store";

const LANGKAH = [
  ["Pilih produk", "Buka katalog, lihat harga dan stok yang tersedia."],
  ["Isi jumlah dan alamat", "Tulis berapa yang mau dipesan, nama, dan alamat Anda."],
  ["Kirim lewat WhatsApp", "Pesan pesanan sudah tersusun, tinggal dikirim ke penjual."],
  ["Tunggu konfirmasi penjual", "Penjual memastikan stok, lalu menyepakati pembayaran dan pengiriman."],
];

export default function Beranda() {
  const d = useDb();
  const now = useNow(60000);
  const terbit = d.products.filter((p) => p.status === "PUBLISHED");
  const siap = terbit.filter((p) => p.stock > 0);
  const nama = (id: string) => d.producers.find((x) => x.id === id)?.name;

  return (
    <>
      <section className="border-b border-garis bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.1fr_1fr] md:items-center md:py-20">
          <div>
            <h1 className="text-4xl leading-[1.08] font-extrabold tracking-tight text-daun-tua sm:text-5xl">
              Hasil kebun dan olahan warga Cinanjung, pesan langsung lewat WhatsApp.
            </h1>
            <p className="mt-5 max-w-[52ch] text-lg text-redup">
              Sayuran hidroponik dari greenhouse KWT Bidara dan produk UMKM desa dalam satu katalog. Stok diperbarui
              sendiri oleh produsennya.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/katalog" className={btn("primary", "lg")}>
                Lihat katalog
              </Link>
              <Link href="#cara-pesan" className={btn("secondary", "lg")}>
                Cara pesan
              </Link>
            </div>
          </div>

          {/* Papan harga: daftar yang benar-benar siap dijual hari ini, seperti papan di warung. */}
          <div className="mr-2.5 mb-2.5 rounded-xl bg-daun-tua p-6 text-white shadow-[10px_10px_0_0_var(--color-pucuk)]">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xl font-extrabold text-pucuk">Tersedia hari ini</h2>
              <time className="text-sm text-white/70">{tgl(now)}</time>
            </div>
            {siap.length === 0 && <p className="mt-4 text-white/80">Belum ada produk yang siap dijual hari ini.</p>}
            <ul className="mt-3">
              {siap.map((p) => (
                <li key={p.id} className="border-t border-white/10 first:border-0">
                  <Link href={`/produk/${p.id}`} className="group block py-3">
                    <span className="flex items-baseline gap-2">
                      <span className="font-bold group-hover:text-pucuk">{p.name}</span>
                      <span aria-hidden className="mb-1 flex-1 border-b border-dotted border-white/40" />
                      <span className="font-bold tabular-nums">
                        {rupiah(p.price)}
                        <span className="font-normal text-white/70">/{p.unit}</span>
                      </span>
                    </span>
                    <span className="mt-0.5 block text-sm text-white/65">
                      {nama(p.producerId)}, stok {p.stock} {p.unit}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {(["KEBUN", "UMKM"] as const).map((g) => {
        const list = terbit.filter((p) => groupOf(d, p) === g);
        return (
          <section key={g} className="mx-auto max-w-6xl px-4 pt-12">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-daun-tua">
                  {g === "KEBUN" ? "Hasil kebun KWT Bidara" : "Produk UMKM"}
                </h2>
                <p className="mt-1 text-redup">
                  {g === "KEBUN"
                    ? "Masuk katalog setelah panen dicatat dan diverifikasi pengelola greenhouse."
                    : "Olahan warga desa, dari pepaya sampai bunga telang."}
                </p>
              </div>
              <Link href={`/katalog?grup=${g}`} className="shrink-0 text-sm font-semibold text-daun underline underline-offset-4">
                Lihat semua
              </Link>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {list.slice(0, 4).map((p) => (
                <ProductCard key={p.id} d={d} p={p} />
              ))}
            </div>
            {list.length === 0 && <p className="mt-5 text-redup">Belum ada produk di bagian ini.</p>}
          </section>
        );
      })}

      <section id="cara-pesan" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-14">
        <h2 className="text-2xl font-extrabold tracking-tight text-daun-tua">Cara pesan</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LANGKAH.map(([judul, isi], i) => (
            <li key={judul} className="border-t-4 border-daun pt-3">
              <p className="text-sm font-bold text-telang">Langkah {i + 1}</p>
              <h3 className="mt-1 font-bold">{judul}</h3>
              <p className="mt-1 text-sm text-redup">{isi}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="produsen" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
        <h2 className="text-2xl font-extrabold tracking-tight text-daun-tua">Produsen</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {d.producers
            .filter((x) => x.verified)
            .map((x) => (
              <li key={x.id}>
                <Link
                  href={`/produsen/${x.id}`}
                  className="block h-full rounded-lg border border-garis bg-white p-5 transition-colors hover:border-daun"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{x.name}</h3>
                    <Badge tone={x.type === "KWT" ? "ok" : "info"}>{LABEL[x.type]}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-redup">{x.description}</p>
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </>
  );
}
