// Service worker PWA Desa Cinanjung.
// ponytail: hanya halaman yang SUDAH pernah dibuka yang tersedia saat offline (cache saat dipakai).
// Kalau butuh semua halaman tersedia sejak pemasangan, pindah ke precache (misalnya Serwist).
const CACHE = "cinanjung-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Hanya aset Next.js yang namanya ber-hash yang tidak pernah berubah: ambil dari cache dulu.
  // File di public/ (ikon, gambar produk) bisa berganti isi dengan nama yang sama, jadi ikut jaringan dulu.
  // Halaman dan data: jaringan dulu supaya selalu baru, cache dipakai hanya saat offline.
  const immutable = url.pathname.startsWith("/_next/static/");

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      if (immutable && cached) return cached;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        if (cached) return cached;
        if (req.mode === "navigate") return (await cache.match("/")) ?? Response.error();
        return Response.error();
      }
    })(),
  );
});
