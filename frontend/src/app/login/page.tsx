"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { Button, ErrorNote, Field, Logo, btn } from "@/components/ui";
import { LABEL } from "@/lib/logic";
import { DEMO_PASSWORD } from "@/lib/seed";
import { formData, login, resetDb, useDb, useTry } from "@/lib/store";

export default function Login() {
  const d = useDb();
  const router = useRouter();
  const [error, run] = useTry();
  const masuk = (email: string, password: string) => run(() => login(email, password)) && router.push("/dashboard");

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = formData(e);
    masuk(f.email, f.password);
  }

  return (
    <main className="mx-auto grid min-h-dvh max-w-4xl items-center gap-8 px-4 py-10 md:grid-cols-2">
      <div>
        <Link href="/" className="inline-flex items-center gap-2.5 font-extrabold text-daun-tua">
          <Logo className="size-8 text-daun" />
          Desa Cinanjung
        </Link>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-daun-tua">Masuk ke dashboard</h1>
        <p className="mt-2 text-redup">Untuk pengelola KWT, pelaku UMKM, admin, dan pemerintah desa.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Email">
            <input name="email" type="email" className="inp" autoComplete="username" required />
          </Field>
          <Field label="Kata sandi">
            <input name="password" type="password" className="inp" autoComplete="current-password" required />
          </Field>
          <ErrorNote>{error}</ErrorNote>
          <button type="submit" className={`w-full ${btn("primary", "lg")}`}>
            Masuk
          </button>
        </form>
        <p className="mt-4 text-sm text-redup">
          Pembeli tidak perlu masuk.{" "}
          <Link href="/katalog" className="font-semibold text-daun underline">
            Buka katalog
          </Link>
        </p>
      </div>

      <aside className="rounded-xl border border-garis bg-white p-5">
        <h2 className="font-extrabold text-daun-tua">Akun demo</h2>
        <p className="mt-1 text-sm text-redup">
          Prototipe ini belum tersambung ke server. Pilih peran untuk langsung mencoba tampilannya.
        </p>
        <ul className="mt-4 space-y-2">
          {d.users
            .filter((u) => u.password === DEMO_PASSWORD)
            .map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => masuk(u.email, u.password)}
                  className="w-full rounded-md border border-garis px-3 py-2.5 text-left transition-colors hover:border-daun hover:bg-daun-muda"
                >
                  <span className="block font-semibold">{LABEL[u.role]}</span>
                  <span className="block text-sm text-redup">{u.name}</span>
                </button>
              </li>
            ))}
        </ul>
        <div className="mt-5 border-t border-garis pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => confirm("Semua perubahan di browser ini akan dihapus dan diganti data contoh awal. Lanjutkan?") && resetDb()}
          >
            Kembalikan data contoh
          </Button>
        </div>
      </aside>
    </main>
  );
}
