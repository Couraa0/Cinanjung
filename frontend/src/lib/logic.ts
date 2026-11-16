// Aturan bisnis murni: tanpa React, tanpa localStorage. Dicek oleh `npm run check`.
// Setiap fungsi mengubah `d` langsung dan melempar Error berbahasa Indonesia kalau aturan dilanggar.
// Saat backend dibuat, isi file ini pindah ke server (kontrak API ada di Technical Workflow 7.2).
import type {
  Alert,
  Db,
  Device,
  IrrigationLog,
  MovementType,
  Order,
  OrderStatus,
  Product,
  Reading,
  ReadingPayload,
  Role,
  Sale,
  SensorKey,
  SensorValues,
  User,
} from "./types";

// ---------- Label dan konstanta ----------

// `range` = rentang teknis sensor (untuk validasi pembacaan), BUKAN ambang ideal tanaman.
// Ambang tanaman diatur admin di Konfigurasi (config.thresholds).
export const SENSORS: Record<SensorKey, { label: string; unit: string; range: [number, number] }> = {
  temperature: { label: "Suhu udara", unit: "°C", range: [-40, 80] },
  humidity: { label: "Kelembapan udara", unit: "%", range: [0, 100] },
  waterLevel: { label: "Air tandon", unit: "%", range: [0, 100] },
  soilMoisture: { label: "Kelembapan media", unit: "%", range: [0, 100] },
  ph: { label: "pH larutan", unit: "pH", range: [0, 14] },
  ec: { label: "EC nutrisi", unit: "mS/cm", range: [0, 10] },
};
export const SENSOR_KEYS = Object.keys(SENSORS) as SensorKey[];

export const LABEL: Record<string, string> = {
  INQUIRY: "Pesan dibuat",
  PENDING_CONFIRMATION: "Menunggu konfirmasi",
  CONFIRMED: "Disetujui",
  PROCESSING: "Diproses",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  DRAFT: "Draf",
  PUBLISHED: "Terbit",
  OUT_OF_STOCK: "Stok habis",
  INACTIVE: "Nonaktif",
  HARVESTED: "Dipanen",
  PENDING_REVIEW: "Menunggu verifikasi",
  APPROVED: "Terverifikasi",
  ONLINE: "Online",
  OFFLINE: "Offline",
  SENSOR_ERROR: "Sensor error",
  SUPER_ADMIN: "Super Admin",
  ADMIN_KWT: "Admin KWT",
  OPERATOR_KWT: "Operator KWT",
  ADMIN_UMKM: "Admin UMKM",
  PEMDES: "Pemerintah Desa",
  INITIAL: "Stok awal",
  PRODUCTION: "Penambahan produksi",
  SALE: "Penjualan",
  ADJUSTMENT: "Penyesuaian manual",
  RETURN: "Pembatalan pesanan",
  DIHENTIKAN: "Dihentikan manual",
  BATAS_WAKTU: "Mati otomatis (batas waktu)",
  AIR_RENDAH: "Mati otomatis (air tandon rendah)",
  KWT: "Kelompok Wanita Tani",
  UMKM: "UMKM",
};

export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  INQUIRY: ["PENDING_CONFIRMATION", "CONFIRMED", "CANCELLED"],
  PENDING_CONFIRMATION: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

// ---------- Hak akses (Blueprint bagian 6) ----------

export const KEBUN_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN_KWT", "OPERATOR_KWT"];
export const PASAR_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN_KWT", "ADMIN_UMKM"];
/** Verifikasi panen, kontrol pompa, dan membuat batch hanya untuk Admin KWT (dan Super Admin). */
export const isKwtAdmin = (r: Role) => r === "SUPER_ADMIN" || r === "ADMIN_KWT";
/** Setiap produsen hanya melihat datanya sendiri; Super Admin melihat semua. */
export const owns = (u: User, producerId: string) => u.role === "SUPER_ADMIN" || u.producerId === producerId;

// ---------- Utilitas ----------

let seq = 0;
export const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${(seq++ % 1296).toString(36).padStart(2, "0")}`.toUpperCase();

export const rupiah = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");

function fail(msg: string): never {
  throw new Error(msg);
}
function must<T>(v: T | undefined, msg: string): T {
  if (v === undefined) fail(msg);
  return v;
}
const round2 = (n: number) => Math.round(n * 100) / 100;

const device = (d: Db, id: string) => must(d.devices.find((x) => x.id === id), "Perangkat tidak terdaftar.");
const product = (d: Db, id: string) => must(d.products.find((x) => x.id === id), "Produk tidak ditemukan.");
const harvest = (d: Db, id: string) => must(d.harvests.find((x) => x.id === id), "Catatan panen tidak ditemukan.");

export const productStatus = (p: Product) => (p.status === "PUBLISHED" && p.stock <= 0 ? "OUT_OF_STOCK" : p.status);

/** Pembacaan terbaru sebuah perangkat. `readings` selalu terurut menurut timestamp. */
export function latestReading(d: Db, deviceId: string): Reading | undefined {
  for (let i = d.readings.length - 1; i >= 0; i--) if (d.readings[i].deviceId === deviceId) return d.readings[i];
}

function pushAlert(d: Db, deviceId: string, parameter: Alert["parameter"], message: string, timestamp: string) {
  d.alerts.push({ id: uid("AL"), deviceId, parameter, message, timestamp, read: false });
}

// ---------- IoT: menerima pembacaan (POST /api/v1/iot/readings) ----------

/** @returns false kalau pembacaan duplikat (perangkat + timestamp sama) dan diabaikan. */
export function ingestReading(d: Db, p: ReadingPayload): boolean {
  const dev = device(d, p.deviceId);
  if (Number.isNaN(Date.parse(p.timestamp))) fail("Timestamp pembacaan tidak valid.");
  if (d.readings.some((r) => r.deviceId === dev.id && r.timestamp === p.timestamp)) return false;

  const prev = latestReading(d, dev.id);
  const r: Reading = {
    id: uid("R"),
    deviceId: dev.id,
    timestamp: p.timestamp,
    temperature: null,
    humidity: null,
    waterLevel: null,
    soilMoisture: null,
    ph: null,
    ec: null,
  };
  if (p.late) r.late = true;

  // Satu sensor gagal tidak boleh menghentikan sensor lain: nilai yang tidak valid disimpan null.
  const failed: SensorKey[] = [];
  for (const k of dev.sensors) {
    const v = p.values[k];
    const [lo, hi] = SENSORS[k].range;
    if (typeof v !== "number" || Number.isNaN(v) || v < lo || v > hi) failed.push(k);
    else r[k] = v;
  }
  d.readings.push(r);
  d.readings.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  // ponytail: semua pembacaan disimpan di localStorage, dibatasi 800 terbaru. Di backend pakai tabel sensor_readings.
  if (d.readings.length > 800) d.readings.splice(0, d.readings.length - 800);

  // Data yang terlambat masuk hanya melengkapi riwayat; tidak memicu status atau peringatan baru.
  if (p.late) return true;

  for (const k of failed)
    if (!dev.failedSensors.includes(k))
      pushAlert(d, dev.id, k, `Sensor ${SENSORS[k].label.toLowerCase()} tidak memberi pembacaan yang valid.`, p.timestamp);
  dev.failedSensors = failed;
  dev.status = failed.length ? "SENSOR_ERROR" : "ONLINE";
  dev.lastSeen = p.timestamp;

  // Peringatan hanya dibuat saat nilai BARU keluar dari ambang, supaya tidak berulang tiap pembacaan.
  for (const k of dev.sensors) {
    const v = r[k];
    const t = d.config.thresholds[k];
    if (v == null || !t) continue;
    const pv = prev?.[k];
    const wasOut = pv != null && (pv < t.min || pv > t.max);
    if ((v < t.min || v > t.max) && !wasOut) {
      const { label, unit } = SENSORS[k];
      pushAlert(d, dev.id, k, `${label} ${v} ${unit}, di luar ambang ${t.min}–${t.max} ${unit}.`, p.timestamp);
    }
  }

  // Pengaman pompa: mati kalau air tandon kurang atau sensor air gagal.
  if (dev.pumpOnSince) {
    if (r.waterLevel == null) stopPump(d, dev, p.timestamp, "SENSOR_ERROR");
    else if (r.waterLevel < d.config.minWaterForPump) stopPump(d, dev, p.timestamp, "AIR_RENDAH");
  }
  return true;
}

// ---------- Pompa ----------

export function pumpOn(d: Db, deviceId: string, now: string) {
  const dev = device(d, deviceId);
  if (!dev.hasPump) fail("Perangkat ini tidak punya pompa.");
  if (dev.pumpOnSince) return;
  if (dev.status !== "ONLINE") fail("Pompa hanya bisa dinyalakan saat perangkat online dan semua sensor normal.");
  const w = latestReading(d, deviceId)?.waterLevel;
  if (w == null) fail("Level air tandon belum terbaca, pompa tidak dinyalakan.");
  if (w < d.config.minWaterForPump)
    fail(`Air tandon ${w}% di bawah batas ${d.config.minWaterForPump}%. Isi tandon dulu sebelum menyalakan pompa.`);
  dev.pumpOnSince = now;
}

export function pumpOff(d: Db, deviceId: string, now: string) {
  const dev = device(d, deviceId);
  if (dev.pumpOnSince) stopPump(d, dev, now, "DIHENTIKAN");
}

/** Mematikan pompa yang sudah melewati batas waktu operasi. Dipanggil berkala. */
export function pumpTick(d: Db, now: string) {
  const limitMs = d.config.pumpMaxMinutes * 60000;
  for (const dev of d.devices) {
    if (!dev.pumpOnSince) continue;
    const start = Date.parse(dev.pumpOnSince);
    if (Date.parse(now) - start >= limitMs) stopPump(d, dev, new Date(start + limitMs).toISOString(), "BATAS_WAKTU");
  }
}

function stopPump(d: Db, dev: Device, now: string, status: IrrigationLog["status"]) {
  const startedAt = dev.pumpOnSince!;
  const durationSec = Math.max(0, Math.round((Date.parse(now) - Date.parse(startedAt)) / 1000));
  d.irrigationLogs.push({ id: uid("IR"), deviceId: dev.id, startedAt, durationSec, status });
  dev.pumpOnSince = null;
  if (status === "AIR_RENDAH") pushAlert(d, dev.id, "pump", "Pompa dimatikan otomatis karena air tandon rendah.", now);
  if (status === "SENSOR_ERROR") pushAlert(d, dev.id, "pump", "Pompa dimatikan otomatis karena sensor air tandon gagal.", now);
  if (status === "BATAS_WAKTU") pushAlert(d, dev.id, "pump", "Pompa dimatikan otomatis karena mencapai batas waktu.", now);
}

// ---------- Simulasi perangkat (pengganti ESP32 selama belum ada hardware dan backend) ----------

export type Scenario = "NORMAL" | "AIR_RENDAH" | "SENSOR_RUSAK" | "WIFI_PUTUS";

/** Pola suhu dan kelembapan harian buatan. Ini BUKAN hasil pengukuran greenhouse Cinanjung. */
export function climate(ms: number) {
  const t = new Date(ms);
  const sun = Math.sin(((t.getHours() + t.getMinutes() / 60 - 9) / 24) * 2 * Math.PI);
  return { temperature: Math.round((27 + 4 * sun) * 10) / 10, humidity: Math.round((72 - 10 * sun) * 10) / 10 };
}

export function simulateTick(d: Db, deviceId: string, scenario: Scenario, nowMs: number) {
  const dev = device(d, deviceId);
  const prevWater = latestReading(d, deviceId)?.waterLevel ?? 70;
  const hour = nowMs / 3600e3;
  const values: Partial<SensorValues> = {
    ...climate(nowMs),
    waterLevel: scenario === "AIR_RENDAH" ? 18 : Math.max(35, round2(prevWater - (dev.pumpOnSince ? 0.5 : 0.05))),
    soilMoisture: round2(55 + 5 * Math.sin(hour)),
    ph: round2(6 + 0.3 * Math.sin(hour / 2)),
    ec: round2(1.6 + 0.2 * Math.sin(hour / 3)),
  };
  if (scenario === "SENSOR_RUSAK") values.temperature = null;
  const payload: ReadingPayload = { deviceId, timestamp: new Date(nowMs).toISOString(), values };

  if (scenario === "WIFI_PUTUS") {
    // ESP32 menyimpan pembacaan di memori lokal sampai koneksi pulih.
    dev.status = "OFFLINE";
    dev.buffer.push(payload);
    if (dev.buffer.length > 200) dev.buffer.shift();
    return;
  }
  for (const held of dev.buffer.splice(0)) ingestReading(d, { ...held, late: true });
  ingestReading(d, payload);
}

// ---------- Panen: HARVESTED → PENDING_REVIEW → APPROVED → PUBLISHED ----------

export function recordHarvest(
  d: Db,
  h: { batchId: string; harvestDate: string; quantity: number; unit: string; qualityNote: string; closeBatch?: boolean },
) {
  const b = must(d.batches.find((x) => x.id === h.batchId), "Pilih batch tanaman dulu.");
  if (!(h.quantity > 0)) fail("Jumlah panen harus lebih dari 0.");
  if (!h.unit.trim()) fail("Isi satuan panen, misalnya kg.");
  d.harvests.push({
    id: uid("H"),
    batchId: b.id,
    harvestDate: h.harvestDate,
    quantity: h.quantity,
    unit: h.unit.trim(),
    qualityNote: h.qualityNote.trim(),
    availableQuantity: null,
    status: "HARVESTED",
  });
  if (h.closeBatch) b.active = false;
}

export function submitHarvest(d: Db, id: string) {
  const h = harvest(d, id);
  if (h.status !== "HARVESTED") fail("Panen ini sudah diajukan.");
  h.status = "PENDING_REVIEW";
}

export function approveHarvest(d: Db, id: string, available: number) {
  const h = harvest(d, id);
  if (h.status !== "PENDING_REVIEW") fail("Panen ini belum diajukan untuk verifikasi.");
  if (!(available >= 0 && available <= h.quantity))
    fail(`Jumlah layak jual harus antara 0 dan ${h.quantity} ${h.unit}.`);
  h.availableQuantity = available;
  h.status = "APPROVED";
}

/**
 * Titik integrasi Smart Garden → Marketplace. Hanya panen terverifikasi yang boleh masuk katalog.
 * Tanpa `intoProductId`: membuat draf produk baru. Dengan `intoProductId`: menambah stok produk KWT yang sudah ada.
 * @returns id produk
 */
export function harvestToCatalog(d: Db, harvestId: string, producerId: string, at: string, intoProductId?: string): string {
  const h = harvest(d, harvestId);
  if (h.status !== "APPROVED") fail("Hanya panen yang sudah diverifikasi yang bisa masuk katalog.");
  if (h.productId) return h.productId;
  if (!h.availableQuantity) fail("Tidak ada jumlah layak jual dari panen ini.");
  const b = must(d.batches.find((x) => x.id === h.batchId), "Batch tanaman tidak ditemukan.");

  let p: Product;
  if (intoProductId) {
    p = product(d, intoProductId);
    if (p.producerId !== producerId) fail("Produk itu bukan milik produsen ini.");
    p.harvestId = h.id;
  } else {
    p = {
      id: uid("P"),
      producerId,
      categoryId: d.categories.find((c) => c.group === "KEBUN")?.id ?? "",
      name: b.cropName,
      description: "",
      price: 0,
      unit: h.unit,
      stock: 0,
      status: "DRAFT",
      imageUrl: "",
      harvestId: h.id,
    };
    d.products.push(p);
  }
  moveStock(d, p.id, "PRODUCTION", h.availableQuantity, `Panen ${h.id}`, at);
  h.productId = p.id;
  if (p.status === "PUBLISHED") h.status = "PUBLISHED";
  return p.id;
}

// ---------- Produk ----------

export function saveProduct(
  d: Db,
  input: {
    id?: string;
    producerId: string;
    categoryId: string;
    name: string;
    description: string;
    price: number;
    unit: string;
    imageUrl: string;
    initialStock?: number;
  },
  at: string,
): string {
  if (!input.name.trim()) fail("Isi nama produk.");
  if (Number.isNaN(input.price) || input.price < 0) fail("Harga tidak valid.");
  const fields = {
    categoryId: input.categoryId,
    name: input.name.trim(),
    description: input.description.trim(),
    price: input.price,
    unit: input.unit.trim(),
    imageUrl: input.imageUrl,
  };
  if (input.id) {
    Object.assign(product(d, input.id), fields);
    return input.id;
  }
  must(d.producers.find((x) => x.id === input.producerId), "Pilih produsen pemilik produk.");
  const p: Product = { id: uid("P"), producerId: input.producerId, ...fields, stock: 0, status: "DRAFT" };
  d.products.push(p);
  if (input.initialStock) moveStock(d, p.id, "INITIAL", input.initialStock, "Stok awal", at);
  return p.id;
}

export function publishProduct(d: Db, id: string) {
  const p = product(d, id);
  const missing = [
    !p.name.trim() && "nama",
    !d.categories.some((c) => c.id === p.categoryId) && "kategori",
    !(p.price > 0) && "harga",
    !p.unit.trim() && "satuan",
  ].filter(Boolean);
  if (missing.length) fail(`Belum bisa diterbitkan. Lengkapi dulu: ${missing.join(", ")}.`);
  if (!d.producers.find((x) => x.id === p.producerId)?.verified)
    fail("Profil produsen belum diverifikasi admin, jadi produk belum bisa diterbitkan.");
  p.status = "PUBLISHED";
  for (const h of d.harvests) if (h.productId === p.id && h.status === "APPROVED") h.status = "PUBLISHED";
}

// ---------- Stok: setiap perubahan dicatat sebagai pergerakan, tidak menimpa angka terakhir ----------

export function moveStock(d: Db, productId: string, type: MovementType, qty: number, note: string, at: string) {
  const p = product(d, productId);
  if (!qty || Number.isNaN(qty)) fail("Jumlah tidak boleh kosong atau 0.");
  if (p.stock + qty < 0) fail(`Stok ${p.name} tidak cukup (tersisa ${p.stock} ${p.unit}).`);
  p.stock = round2(p.stock + qty);
  d.movements.push({ id: uid("M"), productId, type, qty, note, createdAt: at });
}

// ---------- Pesanan ----------

// ponytail: satu produk per pesanan (sesuai alur 5.1). `items` tetap array supaya keranjang bisa ditambah nanti.
export function createOrder(
  d: Db,
  o: { productId: string; qty: number; customerName: string; customerAddress: string },
  at: string,
): Order {
  const p = product(d, o.productId);
  if (p.status !== "PUBLISHED") fail("Produk ini sedang tidak dijual.");
  if (!(o.qty > 0)) fail("Jumlah pesanan harus lebih dari 0.");
  if (o.qty > p.stock) fail(`Stok tersisa ${p.stock} ${p.unit}. Kurangi jumlah pesanan.`);
  if (!o.customerName.trim()) fail("Isi nama pemesan.");
  if (!o.customerAddress.trim()) fail("Isi alamat pengiriman atau pengambilan.");
  // Status awal INQUIRY dan stok TIDAK dikurangi: tombol WhatsApp belum berarti pesanan disetujui atau dibayar.
  const order: Order = {
    id: uid("ORD"),
    producerId: p.producerId,
    customerName: o.customerName.trim(),
    customerAddress: o.customerAddress.trim(),
    items: [{ productId: p.id, name: p.name, price: p.price, unit: p.unit, qty: o.qty }],
    total: p.price * o.qty,
    status: "INQUIRY",
    createdAt: at,
    updatedAt: at,
  };
  d.orders.push(order);
  return order;
}

/**
 * Kebijakan stok (Technical Workflow 5.2 dan 8.3, "sesuai kebijakan transaksi"):
 * stok dialokasikan saat penjual menyetujui (CONFIRMED), dikembalikan kalau dibatalkan setelahnya,
 * dan penjualan masuk pembukuan saat COMPLETED.
 */
export function setOrderStatus(d: Db, id: string, next: OrderStatus, at: string) {
  const o = must(d.orders.find((x) => x.id === id), "Pesanan tidak ditemukan.");
  if (!NEXT_STATUS[o.status].includes(next))
    fail(`Pesanan berstatus "${LABEL[o.status]}" tidak bisa diubah menjadi "${LABEL[next]}".`);
  const allocated = o.status === "CONFIRMED" || o.status === "PROCESSING";
  if (next === "CONFIRMED") for (const i of o.items) moveStock(d, i.productId, "SALE", -i.qty, `Pesanan ${o.id}`, at);
  if (next === "CANCELLED" && allocated)
    for (const i of o.items) moveStock(d, i.productId, "RETURN", i.qty, `Pesanan ${o.id} dibatalkan`, at);
  if (next === "COMPLETED")
    d.sales.push({ id: uid("S"), producerId: o.producerId, orderId: o.id, items: o.items, total: o.total, date: at });
  o.status = next;
  o.updatedAt = at;
}

export function waMessage(o: Order): string {
  const items = o.items
    .map((i) => `Produk: ${i.name}\nJumlah: ${i.qty} ${i.unit}\nHarga: ${rupiah(i.price)}/${i.unit}`)
    .join("\n\n");
  return [
    "Halo, saya ingin memesan produk:",
    "",
    items,
    `Total estimasi: ${rupiah(o.total)}`,
    "",
    `Nama: ${o.customerName}`,
    `Alamat: ${o.customerAddress}`,
    `No. pesanan: ${o.id}`,
    "",
    "Mohon konfirmasi ketersediaan produk.",
    "Terima kasih.",
  ].join("\n");
}

export const waLink = (phone: string, text: string) =>
  `https://wa.me/${phone.replace(/\D/g, "").replace(/^0/, "62")}?text=${encodeURIComponent(text)}`;

// ---------- Pembukuan (Digital Ledger). Yang dicatat OMZET, bukan laba. ----------

/** Penjualan langsung di luar pesanan WhatsApp (titip jual, beli di tempat). */
export function recordSale(d: Db, s: { productId: string; qty: number; date: string; note: string }) {
  const p = product(d, s.productId);
  if (!(s.qty > 0)) fail("Jumlah terjual harus lebih dari 0.");
  const note = s.note.trim() || "Penjualan langsung";
  moveStock(d, p.id, "SALE", -s.qty, note, s.date);
  d.sales.push({
    id: uid("S"),
    producerId: p.producerId,
    items: [{ productId: p.id, name: p.name, price: p.price, unit: p.unit, qty: s.qty }],
    total: p.price * s.qty,
    date: s.date,
    note,
  });
}

const pad = (n: number) => String(n).padStart(2, "0");
/** Tanggal lokal perangkat, YYYY-MM-DD. */
export function dayKey(iso: string | number | Date) {
  const t = new Date(iso);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}
export const monthKey = (iso: string) => dayKey(iso).slice(0, 7);

export function sumBy<T>(rows: T[], key: (r: T) => string, val: (r: T) => number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[key(r)] = (out[key(r)] ?? 0) + val(r);
  return out;
}

export function bestSellers(sales: Sale[]) {
  const m = new Map<string, { name: string; unit: string; qty: number; total: number }>();
  for (const s of sales)
    for (const i of s.items) {
      const e = m.get(i.productId) ?? { name: i.name, unit: i.unit, qty: 0, total: 0 };
      e.qty = round2(e.qty + i.qty);
      e.total += i.qty * i.price;
      m.set(i.productId, e);
    }
  return [...m.values()].sort((a, b) => b.qty - a.qty);
}
