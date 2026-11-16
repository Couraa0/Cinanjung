"use client";
import { useSearchParams } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { ProductImage, groupOf } from "@/components/product";
import { Button, Card, Empty, ErrorNote, Field, PageHead, Status, TableWrap } from "@/components/ui";
import { owns, productStatus, publishProduct, rupiah, saveProduct } from "@/lib/logic";
import { formData, mutate, nowIso, useDb, useTry, useUser } from "@/lib/store";
import type { Product } from "@/lib/types";

/** Mengecilkan foto ke maksimal 640 px supaya muat di penyimpanan browser. */
async function toDataUrl(file: File, max = 640) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.72);
}

export default function Produk() {
  const d = useDb();
  const user = useUser()!;
  const [editing, setEditing] = useState(useSearchParams().get("edit")); // id produk, "baru", atau null
  const [error, run] = useTry();
  const products = d.products.filter((p) => owns(user, p.producerId));
  const target = products.find((p) => p.id === editing);

  const setStatus = (id: string, status: Product["status"]) =>
    run(() =>
      mutate((db) => {
        if (status === "PUBLISHED") return publishProduct(db, id);
        db.products.find((p) => p.id === id)!.status = status;
      }),
    );

  return (
    <>
      <PageHead
        title="Produk"
        desc="Produk berstatus Terbit tampil di katalog pembeli. Draf dan Nonaktif hanya terlihat di sini."
        action={<Button onClick={() => setEditing("baru")}>Tambah produk</Button>}
      />

      {(editing === "baru" || target) && <ProductForm key={editing} product={target} onDone={() => setEditing(null)} />}

      <div className="mb-3">
        <ErrorNote>{error}</ErrorNote>
      </div>

      {products.length === 0 ? (
        <Empty>Belum ada produk. Tekan Tambah produk untuk membuat yang pertama.</Empty>
      ) : (
        <TableWrap>
          <table className="tbl">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Harga</th>
                <th>Stok</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="flex min-w-56 items-center gap-3">
                      <ProductImage p={p} group={groupOf(d, p)} compact className="size-12 shrink-0 rounded-md" />
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        <p className="text-redup">
                          {d.categories.find((c) => c.id === p.categoryId)?.name ?? "Tanpa kategori"}
                          {user.role === "SUPER_ADMIN" && `, ${d.producers.find((x) => x.id === p.producerId)?.name}`}
                        </p>
                        {p.harvestId && <p className="text-redup">Dari panen {p.harvestId}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap tabular-nums">{p.price > 0 ? `${rupiah(p.price)}/${p.unit}` : "Belum diisi"}</td>
                  <td className="whitespace-nowrap tabular-nums">
                    {p.stock} {p.unit}
                  </td>
                  <td>
                    <Status value={productStatus(p)} />
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setEditing(p.id)}>
                        Ubah
                      </Button>
                      {p.status === "PUBLISHED" ? (
                        <Button size="sm" variant="secondary" onClick={() => setStatus(p.id, "INACTIVE")}>
                          Nonaktifkan
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => setStatus(p.id, "PUBLISHED")}>
                          Terbitkan
                        </Button>
                      )}
                    </div>
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

function ProductForm({ product, onDone }: { product?: Product; onDone: () => void }) {
  const d = useDb();
  const user = useUser()!;
  const [img, setImg] = useState(product?.imageUrl ?? "");
  const [error, run] = useTry();
  const producers = d.producers.filter((p) => owns(user, p.id));

  async function pilihFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImg(await toDataUrl(file));
    } catch {
      alert("File itu tidak bisa dibaca sebagai gambar. Pilih foto JPG atau PNG.");
    }
  }

  function simpan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = formData(e);
    const ok = run(() =>
      mutate((db) =>
        saveProduct(
          db,
          {
            id: product?.id,
            producerId: product?.producerId ?? f.producerId ?? producers[0]?.id ?? "",
            categoryId: f.categoryId,
            name: f.name,
            description: f.description,
            price: Number(f.price),
            unit: f.unit,
            imageUrl: img,
            initialStock: Number(f.initialStock) || 0,
          },
          nowIso(),
        ),
      ),
    );
    if (ok) onDone();
  }

  return (
    <Card className="mb-6 border-daun">
      <h2 className="font-extrabold text-daun-tua">{product ? `Ubah ${product.name}` : "Produk baru"}</h2>
      <form onSubmit={simpan} className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Nama produk">
          <input name="name" className="inp" defaultValue={product?.name} required />
        </Field>
        <Field label="Kategori">
          <select name="categoryId" className="inp" defaultValue={product?.categoryId} required>
            {(["KEBUN", "UMKM"] as const).map((g) => (
              <optgroup key={g} label={g === "KEBUN" ? "Hasil kebun" : "Produk UMKM"}>
                {d.categories
                  .filter((c) => c.group === g)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Harga (Rp)" hint="per satuan">
          <input name="price" type="number" min={0} step={100} className="inp" defaultValue={product?.price || ""} required />
        </Field>
        <Field label="Satuan" hint="kg, bungkus, botol">
          <input name="unit" className="inp" defaultValue={product?.unit} required />
        </Field>
        {!product && (
          <Field label="Stok awal">
            <input name="initialStock" type="number" min={0} step="any" className="inp" defaultValue={0} />
          </Field>
        )}
        {!product && producers.length > 1 && (
          <Field label="Produsen">
            <select name="producerId" className="inp" required>
              {producers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Deskripsi" className="sm:col-span-2">
          <textarea name="description" className="inp" rows={2} defaultValue={product?.description} />
        </Field>
        <Field label="Foto produk" className="sm:col-span-2">
          <div className="flex flex-wrap items-center gap-3">
            {img && (
              // eslint-disable-next-line @next/next/no-img-element -- pratinjau data URL
              <img src={img} alt="Pratinjau foto produk" className="size-20 rounded-md object-cover" />
            )}
            <input type="file" accept="image/*" onChange={pilihFoto} className="text-sm" />
            {img && (
              <Button size="sm" variant="secondary" onClick={() => setImg("")}>
                Hapus foto
              </Button>
            )}
          </div>
        </Field>
        <div className="sm:col-span-2">
          <ErrorNote>{error}</ErrorNote>
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit">Simpan</Button>
          <Button variant="secondary" onClick={onDone}>
            Batal
          </Button>
        </div>
      </form>
      {product && <p className="mt-3 text-sm text-redup">Jumlah stok diubah lewat menu Stok supaya riwayatnya tercatat.</p>}
    </Card>
  );
}
