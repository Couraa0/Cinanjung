import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Driver Postgres biasa, jadi tidak terikat ke Neon: cukup ganti DATABASE_URL untuk pindah ke Supabase/Railway.
// Pakai alamat "pooled" dari Neon (ada "-pooler" di host-nya). Pooler itu tidak mendukung prepared statement,
// karena itu `prepare: false`.
function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diisi. Lihat frontend/.env.example.");
  // ponytail: maksimal 1 koneksi per instance serverless. Naikkan kalau nanti dijalankan di server biasa.
  return drizzle(postgres(url, { prepare: false, max: 1 }), { schema });
}

// Satu klien per proses. Saat `next dev` memuat ulang modul, klien lama dipakai lagi supaya koneksi tidak menumpuk.
const g = globalThis as unknown as { db?: ReturnType<typeof connect> };
export const db = (g.db ??= connect());
export type Db = typeof db;
