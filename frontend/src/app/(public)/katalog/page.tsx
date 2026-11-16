"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ProductCard, groupOf } from "@/components/product";
import { Empty } from "@/components/ui";
import { useDb } from "@/lib/store";

const GRUP = [
  ["", "Semua"],
  ["KEBUN", "Hasil kebun"],
  ["UMKM", "Produk UMKM"],
];

export default function Katalog() {
  const d = useDb();
  const [grup, setGrup] = useState(useSearchParams().get("grup") ?? "");
  const [kategori, setKategori] = useState("");
  const [cari, setCari] = useState("");

  const kategoriList = d.categories.filter((c) => !grup || c.group === grup);
  const list = d.products.filter(
    (p) =>
      p.status === "PUBLISHED" &&
      (!grup || groupOf(d, p) === grup) &&
      (!kategori || p.categoryId === kategori) &&
      p.name.toLowerCase().includes(cari.trim().toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-daun-tua">Katalog</h1>
      <p className="mt-1 text-redup">Hasil kebun KWT Bidara dan produk UMKM Desa Cinanjung.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border border-garis bg-white p-1" role="group" aria-label="Kelompok produk">
          {GRUP.map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={grup === v}
              onClick={() => {
                setGrup(v);
                setKategori("");
              }}
              className={`rounded px-3 py-1.5 text-sm font-semibold ${grup === v ? "bg-daun text-white" : "hover:bg-daun-muda"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <select className="inp max-w-56" value={kategori} onChange={(e) => setKategori(e.target.value)} aria-label="Kategori">
          <option value="">Semua kategori</option>
          {kategoriList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="search"
          className="inp max-w-64"
          placeholder="Cari nama produk"
          aria-label="Cari nama produk"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((p) => (
          <ProductCard key={p.id} d={d} p={p} />
        ))}
      </div>
      {list.length === 0 && <Empty>Tidak ada produk yang cocok. Coba ganti kategori atau kata pencarian.</Empty>}
    </div>
  );
}
