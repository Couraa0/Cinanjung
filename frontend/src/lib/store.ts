"use client";
// ponytail: seluruh data disimpan di localStorage browser ini (belum ada backend).
// Saat backend siap, ganti getDb/mutate dengan panggilan REST ke API_URL dari env.ts
// (kontrak di Technical Workflow 7.2); aturan di logic.ts pindah ke server.
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { seed } from "./seed";
import type { Db, User } from "./types";

const KEY = "cinanjung-db-v1";
let db: Db | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    alert("Penyimpanan browser penuh, jadi perubahan terakhir belum tersimpan. Hapus foto produk yang besar lalu coba lagi.");
  }
}

export function getDb(): Db {
  if (db) return db;
  try {
    db = JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    db = null;
  }
  if (!db) {
    db = seed();
    persist();
  }
  return db;
}

/** Menjalankan perubahan pada salinan data. Kalau `fn` melempar Error, tidak ada yang berubah. */
export function mutate<T>(fn: (d: Db) => T): T {
  const next = structuredClone(getDb());
  const out = fn(next);
  db = next;
  persist();
  notify();
  return out;
}

function subscribe(l: () => void) {
  // Perubahan dari tab lain (misalnya pembeli memesan di tab katalog) ikut terlihat di dashboard.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    db = null;
    l();
  };
  listeners.add(l);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export const useDb = () => useSyncExternalStore(subscribe, getDb, getDb);

export function useUser(): User | null {
  const d = useDb();
  return d.users.find((u) => u.id === d.session) ?? null;
}

export function login(email: string, password: string) {
  mutate((d) => {
    const u = d.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
    if (!u) throw new Error("Email atau kata sandi salah.");
    d.session = u.id;
  });
}

export const logout = () =>
  mutate((d) => {
    d.session = null;
  });

export function resetDb() {
  db = seed();
  persist();
  notify();
}

/** Jam yang berdetak, supaya "x menit lalu" dan status data usang ikut diperbarui. */
export function useNow(everyMs = 15000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

function subscribeOnline(l: () => void) {
  window.addEventListener("online", l);
  window.addEventListener("offline", l);
  return () => {
    window.removeEventListener("online", l);
    window.removeEventListener("offline", l);
  };
}
export const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

/** Menjalankan aksi dan menangkap pesan Error dari logic.ts untuk ditampilkan ke pengguna. */
export function useTry() {
  const [error, setError] = useState("");
  const run = (fn: () => void) => {
    try {
      fn();
      setError("");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  };
  return [error, run] as const;
}

export const formData = (e: FormEvent<HTMLFormElement>) =>
  Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;

export const nowIso = () => new Date().toISOString();
