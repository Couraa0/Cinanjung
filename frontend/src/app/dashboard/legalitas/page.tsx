"use client";
import { PageHead } from "@/components/ui";
import { useDb } from "@/lib/store";

export default function Legalitas() {
  const d = useDb();
  return (
    <>
      <PageHead
        title="Panduan legalitas"
        desc="Ringkasan tiga izin yang paling sering ditanyakan pembeli. Nomor izin yang sudah Anda punya bisa dicantumkan di Profil usaha."
      />
      <div className="space-y-3">
        {d.legalGuides.map((g) => (
          <details key={g.id} className="rounded-lg border border-garis bg-white" open>
            <summary className="cursor-pointer p-4 font-bold text-daun-tua">{g.title}</summary>
            <p className="max-w-[75ch] border-t border-garis px-4 py-3 leading-relaxed">{g.content}</p>
          </details>
        ))}
      </div>
      <p className="mt-5 max-w-[75ch] text-sm text-redup">
        Persyaratan dan alur pengurusan bisa berubah. Pastikan ketentuan terbaru ke instansi terkait sebelum mengurus.
      </p>
    </>
  );
}
