import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Desa Cinanjung: Smart Garden + Circular Marketplace",
    short_name: "Cinanjung",
    description: "Katalog hasil kebun KWT Bidara dan produk UMKM Desa Cinanjung, pemantauan greenhouse, dan pembukuan.",
    lang: "id",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7ee",
    theme_color: "#1e5a3a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
