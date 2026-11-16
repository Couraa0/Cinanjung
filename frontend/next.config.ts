import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Halaman sengaja baru dirender di browser selama data masih di localStorage (lihat ClientGate),
    // jadi validasi "instant navigation" hanya jalan untuk segmen yang memintanya lewat `export const instant`.
    // Kembalikan ke bawaan ("warning") setelah halaman dirender di server.
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Service worker tidak boleh di-cache browser, supaya versi baru langsung dipakai.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
