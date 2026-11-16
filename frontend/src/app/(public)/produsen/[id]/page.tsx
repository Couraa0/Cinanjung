"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProductCard } from "@/components/product";
import { Badge, Empty } from "@/components/ui";
import { LABEL } from "@/lib/logic";
import { useDb } from "@/lib/store";

export default function ProfilProdusen() {
  const { id } = useParams<{ id: string }>();
  const d = useDb();
  const x = d.producers.find((p) => p.id === id);
  if (!x)
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Empty>
          Produsen tidak ditemukan.{" "}
          <Link href="/#produsen" className="font-semibold text-daun underline">
            Lihat daftar produsen
          </Link>
        </Empty>
      </div>
    );

  const produk = d.products.filter((p) => p.producerId === x.id && p.status === "PUBLISHED");
  const legal = [
    ["NIB", x.nib],
    ["PIRT", x.pirt],
    ["Sertifikat halal", x.halal],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-daun-tua">{x.name}</h1>
        <Badge tone={x.type === "KWT" ? "ok" : "info"}>{LABEL[x.type]}</Badge>
        {x.verified ? <Badge tone="ok">Profil terverifikasi</Badge> : <Badge tone="warn">Belum diverifikasi</Badge>}
      </div>
      <p className="mt-3 max-w-[70ch] text-redup">{x.description}</p>
      <p className="mt-1 text-sm text-redup">{x.location}</p>

      <dl className="mt-6 grid max-w-2xl gap-3 rounded-lg border border-garis bg-white p-5 sm:grid-cols-3">
        {legal.map(([k, v]) => (
          <div key={k}>
            <dt className="text-sm font-semibold">{k}</dt>
            <dd className="text-sm text-redup">{v || "Belum dicantumkan"}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-10 text-2xl font-extrabold tracking-tight text-daun-tua">Produk</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {produk.map((p) => (
          <ProductCard key={p.id} d={d} p={p} />
        ))}
      </div>
      {produk.length === 0 && <Empty>Produsen ini belum punya produk yang terbit.</Empty>}
    </div>
  );
}
