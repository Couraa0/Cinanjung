"use client";
import type { FormEvent } from "react";
import { Button, Card, ErrorNote, Field, PageHead, TableWrap } from "@/components/ui";
import { LABEL, uid } from "@/lib/logic";
import { formData, mutate, useDb, useTry, useUser } from "@/lib/store";
import type { Role } from "@/lib/types";

const ROLES: Role[] = ["SUPER_ADMIN", "ADMIN_KWT", "OPERATOR_KWT", "ADMIN_UMKM", "PEMDES"];
const perluProdusen = (r: Role) => r === "ADMIN_KWT" || r === "OPERATOR_KWT" || r === "ADMIN_UMKM";

export default function Pengguna() {
  const d = useDb();
  const me = useUser()!;
  const [error, run] = useTry();

  function tambah(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = formData(e);
    const form = e.currentTarget;
    const role = f.role as Role;
    const ok = run(() =>
      mutate((db) => {
        const email = f.email.trim().toLowerCase();
        if (db.users.some((u) => u.email.toLowerCase() === email)) throw new Error("Email itu sudah dipakai akun lain.");
        if (f.password.length < 8) throw new Error("Kata sandi minimal 8 karakter.");
        const producer = db.producers.find((p) => p.id === f.producerId);
        if (perluProdusen(role)) {
          if (!producer) throw new Error(`Peran ${LABEL[role]} harus dihubungkan ke produsen.`);
          if ((role === "ADMIN_UMKM") !== (producer.type === "UMKM"))
            throw new Error(`Peran ${LABEL[role]} hanya bisa dihubungkan ke produsen bertipe ${role === "ADMIN_UMKM" ? "UMKM" : "KWT"}.`);
        }
        db.users.push({
          id: uid("U"),
          name: f.name.trim(),
          email,
          password: f.password,
          role,
          producerId: perluProdusen(role) ? producer!.id : undefined,
        });
      }),
    );
    if (ok) form.reset();
  }

  return (
    <>
      <PageHead title="Pengguna" desc="Akun dan peran. Setiap peran hanya melihat menu dan data yang menjadi tanggung jawabnya." />

      <Card className="mb-6">
        <h2 className="font-extrabold text-daun-tua">Tambah akun</h2>
        <form onSubmit={tambah} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nama">
            <input name="name" className="inp" required />
          </Field>
          <Field label="Email">
            <input name="email" type="email" className="inp" autoComplete="off" required />
          </Field>
          <Field label="Kata sandi awal" hint="minimal 8 karakter">
            <input name="password" type="password" className="inp" autoComplete="new-password" minLength={8} required />
          </Field>
          <Field label="Peran">
            <select name="role" className="inp" defaultValue="ADMIN_UMKM">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {LABEL[r]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Produsen" hint="untuk peran KWT dan UMKM">
            <select name="producerId" className="inp">
              <option value="">Tidak ada</option>
              {d.producers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="self-end">
            <Button type="submit">Tambah akun</Button>
          </div>
        </form>
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      </Card>

      <TableWrap>
        <table className="tbl">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Peran</th>
              <th>Produsen</th>
              <th>Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {d.users.map((u) => (
              <tr key={u.id}>
                <td className="font-semibold">{u.name}</td>
                <td>{u.email}</td>
                <td className="whitespace-nowrap">{LABEL[u.role]}</td>
                <td>{d.producers.find((p) => p.id === u.producerId)?.name ?? "–"}</td>
                <td>
                  {u.id === me.id ? (
                    <span className="text-redup">Akun Anda</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        confirm(`Hapus akun ${u.name}? Orang ini tidak bisa masuk lagi.`) &&
                        mutate((db) => {
                          db.users = db.users.filter((x) => x.id !== u.id);
                        })
                      }
                    >
                      Hapus
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
