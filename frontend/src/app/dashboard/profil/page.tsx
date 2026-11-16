"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Badge, Button, Card, Empty, ErrorNote, Field, PageHead } from "@/components/ui";
import { formData, mutate, useDb, useTry, useUser } from "@/lib/store";

export default function ProfilUsaha() {
  const d = useDb();
  const user = useUser()!;
  const [error, run] = useTry();
  const [saved, setSaved] = useState(false);
  const x = d.producers.find((p) => p.id === user.producerId);
  if (!x) return <Empty>Akun ini belum dihubungkan ke profil produsen. Minta Super Admin menghubungkannya di menu Pengguna.</Empty>;

  function simpan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = formData(e);
    setSaved(
      run(() =>
        mutate((db) => {
          if (f.whatsapp.replace(/\D/g, "").length < 9) throw new Error("Nomor WhatsApp terlalu pendek. Tulis lengkap, misalnya 081234567890.");
          Object.assign(db.producers.find((p) => p.id === x!.id)!, {
            name: f.name.trim(),
            whatsapp: f.whatsapp.trim(),
            description: f.description.trim(),
            location: f.location.trim(),
            nib: f.nib.trim(),
            pirt: f.pirt.trim(),
            halal: f.halal.trim(),
          });
        }),
      ),
    );
  }

  return (
    <>
      <PageHead
        title="Profil usaha"
        desc="Tampil di halaman produsen dan di setiap produk Anda. Nomor WhatsApp di sini menjadi tujuan pesan pesanan."
        action={
          <Link href={`/produsen/${x.id}`} className="text-sm font-semibold text-daun underline underline-offset-4">
            Lihat halaman publik
          </Link>
        }
      />
      <Card>
        <p className="mb-4">
          {x.verified ? (
            <Badge tone="ok">Profil terverifikasi admin</Badge>
          ) : (
            <Badge tone="warn">Menunggu verifikasi admin, produk belum bisa diterbitkan</Badge>
          )}
        </p>
        <form onSubmit={simpan} onChange={() => setSaved(false)} className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama usaha atau kelompok">
            <input name="name" className="inp" defaultValue={x.name} required />
          </Field>
          <Field label="Nomor WhatsApp">
            <input name="whatsapp" type="tel" inputMode="tel" className="inp" defaultValue={x.whatsapp} required />
          </Field>
          <Field label="Deskripsi" className="sm:col-span-2">
            <textarea name="description" className="inp" rows={3} defaultValue={x.description} />
          </Field>
          <Field label="Lokasi usaha" className="sm:col-span-2">
            <input name="location" className="inp" defaultValue={x.location} />
          </Field>
          <Field label="NIB" hint="kalau sudah punya">
            <input name="nib" className="inp" defaultValue={x.nib} />
          </Field>
          <Field label="Nomor PIRT" hint="kalau sudah punya">
            <input name="pirt" className="inp" defaultValue={x.pirt} />
          </Field>
          <Field label="Nomor sertifikat halal" hint="kalau sudah punya">
            <input name="halal" className="inp" defaultValue={x.halal} />
          </Field>
          <div className="sm:col-span-2">
            <ErrorNote>{error}</ErrorNote>
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit">Simpan profil</Button>
            {saved && <span className="text-sm font-semibold text-daun">Profil tersimpan.</span>}
          </div>
        </form>
        <p className="mt-4 text-sm text-redup">
          Belum punya NIB, PIRT, atau sertifikat halal?{" "}
          <Link href="/dashboard/legalitas" className="font-semibold text-daun underline">
            Baca panduan legalitas
          </Link>
        </p>
      </Card>
    </>
  );
}
