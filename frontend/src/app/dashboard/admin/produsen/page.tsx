"use client";
import Link from "next/link";
import type { FormEvent } from "react";
import { Badge, Button, Card, ErrorNote, Field, PageHead, TableWrap } from "@/components/ui";
import { LABEL, uid } from "@/lib/logic";
import { formData, mutate, useDb, useTry } from "@/lib/store";

export default function Produsen() {
  const d = useDb();
  const [error, run] = useTry();

  function tambah(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = formData(e);
    const form = e.currentTarget;
    const ok = run(() =>
      mutate((db) => {
        if (f.whatsapp.replace(/\D/g, "").length < 9) throw new Error("Nomor WhatsApp terlalu pendek. Tulis lengkap, misalnya 081234567890.");
        db.producers.push({
          id: uid("PR"),
          type: f.type as "KWT" | "UMKM",
          name: f.name.trim(),
          whatsapp: f.whatsapp.trim(),
          description: "",
          location: "Desa Cinanjung, Kabupaten Sumedang",
          verified: false,
          nib: "",
          pirt: "",
          halal: "",
        });
      }),
    );
    if (ok) form.reset();
  }

  return (
    <>
      <PageHead
        title="Produsen"
        desc="KWT dan UMKM yang berjualan di katalog. Produk baru bisa terbit setelah profil produsennya Anda verifikasi."
      />

      <Card className="mb-6">
        <h2 className="font-extrabold text-daun-tua">Daftarkan produsen</h2>
        <form onSubmit={tambah} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_10rem_1fr_auto]">
          <Field label="Nama usaha atau kelompok">
            <input name="name" className="inp" required />
          </Field>
          <Field label="Jenis">
            <select name="type" className="inp" defaultValue="UMKM">
              <option value="UMKM">UMKM</option>
              <option value="KWT">KWT</option>
            </select>
          </Field>
          <Field label="Nomor WhatsApp">
            <input name="whatsapp" type="tel" inputMode="tel" className="inp" required />
          </Field>
          <div className="self-end">
            <Button type="submit">Daftarkan</Button>
          </div>
        </form>
        <p className="mt-3 text-sm text-redup">
          Setelah terdaftar, buat akun untuk pengelolanya di menu{" "}
          <Link href="/dashboard/admin/pengguna" className="font-semibold text-daun underline">
            Pengguna
          </Link>
          . Pengelola lalu melengkapi profilnya sendiri.
        </p>
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      </Card>

      <TableWrap>
        <table className="tbl">
          <thead>
            <tr>
              <th>Produsen</th>
              <th>WhatsApp</th>
              <th>Legalitas</th>
              <th>Produk</th>
              <th>Verifikasi</th>
            </tr>
          </thead>
          <tbody>
            {d.producers.map((x) => (
              <tr key={x.id}>
                <td>
                  <Link href={`/produsen/${x.id}`} className="font-semibold text-daun underline underline-offset-2">
                    {x.name}
                  </Link>
                  <span className="block text-redup">{LABEL[x.type]}</span>
                </td>
                <td className="whitespace-nowrap">{x.whatsapp}</td>
                <td>
                  {[x.nib && "NIB", x.pirt && "PIRT", x.halal && "Halal"].filter(Boolean).join(", ") || (
                    <span className="text-redup">Belum dicantumkan</span>
                  )}
                </td>
                <td className="tabular-nums">{d.products.filter((p) => p.producerId === x.id).length}</td>
                <td>
                  <div className="flex flex-wrap items-center gap-2">
                    {x.verified ? <Badge tone="ok">Terverifikasi</Badge> : <Badge tone="warn">Belum</Badge>}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        mutate((db) => {
                          const p = db.producers.find((y) => y.id === x.id)!;
                          p.verified = !p.verified;
                        })
                      }
                    >
                      {x.verified ? "Cabut" : "Verifikasi"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
