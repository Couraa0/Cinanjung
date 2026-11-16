import Link from "next/link";
import { productStatus, rupiah } from "@/lib/logic";
import type { Db, Product } from "@/lib/types";
import { Badge } from "./ui";

export const groupOf = (d: Db, p: Product) => d.categories.find((c) => c.id === p.categoryId)?.group ?? "UMKM";

/** Foto produk, atau petak warna berisi nama kalau foto belum diunggah. */
export function ProductImage({
  p,
  group,
  compact,
  className = "",
}: {
  p: Product;
  group: "KEBUN" | "UMKM";
  compact?: boolean; // ukuran kecil di tabel: cukup huruf pertama
  className?: string;
}) {
  if (p.imageUrl)
    // eslint-disable-next-line @next/next/no-img-element -- foto berupa data URL dari unggahan, bukan aset yang bisa dioptimasi next/image
    return <img src={p.imageUrl} alt={p.name} className={`object-cover ${className}`} />;
  return (
    <div
      className={`grid place-items-center text-center leading-tight font-extrabold ${compact ? "" : "p-4 text-lg"} ${
        group === "KEBUN" ? "bg-daun-muda text-daun" : "bg-pepaya-muda text-pepaya-tua"
      } ${className}`}
      aria-hidden
    >
      {compact ? p.name.charAt(0) : p.name}
    </div>
  );
}

export function ProductCard({ d, p }: { d: Db; p: Product }) {
  const producer = d.producers.find((x) => x.id === p.producerId);
  const habis = productStatus(p) === "OUT_OF_STOCK";
  return (
    <Link
      href={`/produk/${p.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-garis bg-white transition-colors hover:border-daun"
    >
      <ProductImage p={p} group={groupOf(d, p)} className={`aspect-[4/3] w-full ${habis ? "opacity-60" : ""}`} />
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-bold group-hover:text-daun">{p.name}</h3>
        <p className="text-sm text-redup">{producer?.name}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="font-extrabold tabular-nums text-daun-tua">
            {rupiah(p.price)}
            <span className="text-sm font-medium text-redup">/{p.unit}</span>
          </p>
          {habis ? <Badge tone="warn">Stok habis</Badge> : <span className="text-sm text-redup">Stok {p.stock} {p.unit}</span>}
        </div>
      </div>
    </Link>
  );
}
