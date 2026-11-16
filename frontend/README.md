# Frontend: Smart Garden + Circular Marketplace Desa Cinanjung

PWA untuk Tim GenAphYah (ACC #NextGreen Leaders Challenge 2026), mengikuti MASTER BLUEPRINT.
Tahap ini **frontend saja**: belum ada backend, database, atau perangkat ESP32 yang tersambung.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:3000
npm run check    # cek aturan bisnis (stok, pesanan, panen, sensor, pompa)
npm run build && npm start   # mode produksi; service worker PWA hanya aktif di sini
```

Halaman Masuk menyediakan akun demo untuk kelima peran.

## Environment variable

Salin `.env.example` menjadi `.env.local`. Semua variabel dibaca di satu tempat, `src/lib/env.ts`.

| Variabel | Kegunaan |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Alamat publik situs. Di Vercel boleh kosong, alamat produksi dipakai otomatis |
| `NEXT_PUBLIC_API_URL` | Alamat REST API backend. Belum dipakai selama backend belum ada |

## Deploy ke Vercel

Impor repo di Vercel dan isi **Root Directory** dengan `frontend`. Langkah lengkapnya ada di README di akar repo.

## Yang masih tiruan

- **Data** disimpan di `localStorage` browser (`src/lib/store.ts`). Tiap browser punya datanya sendiri.
- **Data contoh** ada di `src/lib/seed.ts`: harga, stok, nama UMKM, dan nomor WhatsApp bukan data asli.
- **Pembacaan sensor** dibuat oleh simulasi (`simulateTick` di `src/lib/logic.ts`), bukan hasil pengukuran greenhouse.
- **Login** hanya mencocokkan akun di data contoh. Autentikasi asli (password di-hash, token) adalah tugas backend.

## Menyambungkan ke backend nanti

1. `src/lib/logic.ts` berisi semua aturan bisnis sebagai fungsi murni. Pindahkan ke server apa adanya.
2. Ganti `getDb`/`mutate` di `src/lib/store.ts` dengan panggilan REST sesuai kontrak di Technical Workflow 7.2
   (`/api/v1/auth/login`, `/api/v1/iot/readings`, `/api/v1/products`, dan seterusnya).
3. Hapus `seed.ts` dan panel "Simulasi perangkat" di halaman Pemantauan.
4. Tambah antrean sinkronisasi untuk pencatatan saat offline (Blueprint bagian 9).

## Struktur

| Lokasi | Isi |
| --- | --- |
| `src/app/(public)` | Beranda, katalog, detail produk + checkout WhatsApp, profil produsen |
| `src/app/login` | Halaman masuk |
| `src/app/dashboard` | Ringkasan, Smart Garden, Marketplace, Admin, Laporan. Menu dan hak akses diatur di `layout.tsx` |
| `src/lib` | Tipe data, aturan bisnis, data contoh, penyimpanan |
| `public/sw.js` | Service worker (halaman yang pernah dibuka tetap tersedia saat offline) |
| `scripts/check.mts` | Cek aturan bisnis |
