# Smart Garden + Circular Marketplace Desa Cinanjung

Sistem untuk Tim GenAphYah (ACC #NextGreen Leaders Challenge 2026), mengikuti MASTER BLUEPRINT.

| Folder | Isi | Status |
| --- | --- | --- |
| [`frontend/`](frontend/) | PWA Next.js: katalog, checkout WhatsApp, dashboard Smart Garden, Marketplace, dan Admin | Selesai, masih memakai data contoh |
| `backend/` | REST API + database | Belum dibuat |
| `firmware/` | Program ESP32 | Belum dibuat |

## Deploy ke Vercel

Aplikasinya ada di subfolder, jadi satu pengaturan ini wajib:

1. Di Vercel pilih **Add New > Project**, lalu impor repo ini.
2. Isi **Root Directory** dengan `frontend`. Framework terdeteksi otomatis sebagai Next.js; perintah build dan install biarkan bawaan.
3. Environment Variables boleh dikosongkan untuk tahap ini. Daftarnya ada di [`frontend/.env.example`](frontend/.env.example).
4. Tekan **Deploy**. Setelah itu setiap push ke `main` di-deploy otomatis.

Cara menjalankan di laptop ada di [`frontend/README.md`](frontend/README.md).
