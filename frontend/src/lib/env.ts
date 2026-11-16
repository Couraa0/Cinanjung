// Satu-satunya tempat membaca environment variable. Daftar dan penjelasannya ada di .env.example.

/** Alamat publik situs. Di Vercel jatuh ke alamat produksi proyek kalau NEXT_PUBLIC_SITE_URL kosong (hanya terbaca di server). */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

/** Alamat dasar REST API. Kosong = belum ada backend, aplikasi memakai data contoh di localStorage (lihat store.ts). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
