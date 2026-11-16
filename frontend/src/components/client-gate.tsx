"use client";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

const noop = () => () => {};

// ponytail: tanpa SSR selama data masih di localStorage. Saat backend ada, halaman publik
// (katalog, detail produk) bisa dirender di server dan gate ini cukup membungkus dashboard.
export function ClientGate({ children }: { children: ReactNode }) {
  const ready = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  if (!ready) return <p className="grid min-h-dvh place-items-center text-redup">Memuat…</p>;
  return children;
}
