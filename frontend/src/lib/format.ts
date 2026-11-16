export const tgl = (iso: string | number) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export const jam = (iso: string | number) =>
  new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

export const tglJam = (iso: string | number) => `${tgl(iso)}, ${jam(iso)}`;

export const bulan = (key: string) =>
  new Date(`${key}-01T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

export function lalu(iso: string, now: number) {
  const m = Math.round((now - Date.parse(iso)) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.round(h / 24)} hari lalu`;
}

export function durasi(sec: number) {
  const m = Math.floor(sec / 60);
  return m ? `${m} menit ${sec % 60} detik` : `${sec} detik`;
}
