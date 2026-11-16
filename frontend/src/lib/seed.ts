// DATA CONTOH untuk prototipe. Harga, stok, nama UMKM, nomor WhatsApp, dan pembacaan sensor di sini
// bukan data asli KWT Bidara atau UMKM Cinanjung. Ganti lewat dashboard, atau hapus file ini saat backend ada.
import { climate } from "./logic.ts";
import type { Db, Movement, Product, Reading, Sale } from "./types";

/** Kata sandi akun demo. Hanya berlaku di data contoh; autentikasi asli dikerjakan backend (password di-hash). */
export const DEMO_PASSWORD = "demo1234";

export function seed(now = Date.now()): Db {
  const ago = (hours: number) => new Date(now - hours * 3600e3).toISOString();
  const day = (daysAgo: number) => ago(daysAgo * 24).slice(0, 10);

  // 24 jam pembacaan, tiap 30 menit. pH/EC/kelembapan media null karena sensornya belum dipasang.
  const readings: Reading[] = Array.from({ length: 48 }, (_, i) => {
    const hours = (48 - i) / 2;
    return {
      id: `R-CONTOH-${i}`,
      deviceId: "SG-KWT-001",
      timestamp: ago(hours),
      ...climate(now - hours * 3600e3),
      waterLevel: Math.round((62 + hours * 0.35) * 10) / 10,
      soilMoisture: null,
      ph: null,
      ec: null,
    };
  });

  const products: Product[] = [
    { id: "P-PAKCOY", producerId: "PR-KWT", categoryId: "C-HIDRO", name: "Pakcoy Hidroponik", description: "Pakcoy segar dari greenhouse KWT Bidara.", price: 20000, unit: "kg", stock: 8, status: "PUBLISHED", imageUrl: "/produk/pakcoy.svg", harvestId: "H-CONTOH-1" },
    { id: "P-ABON", producerId: "PR-PEPAYA", categoryId: "C-PEPAYA", name: "Abon Pepaya", description: "Abon dari pepaya, gurih dan kering.", price: 25000, unit: "bungkus", stock: 21, status: "PUBLISHED", imageUrl: "/produk/abon-pepaya.svg" },
    { id: "P-BOLA", producerId: "PR-PEPAYA", categoryId: "C-PEPAYA", name: "Bola-bola Abon Pepaya", description: "Camilan bola-bola berisi abon pepaya.", price: 15000, unit: "bungkus", stock: 15, status: "PUBLISHED", imageUrl: "/produk/bola-abon.svg" },
    { id: "P-DAUN", producerId: "PR-PEPAYA", categoryId: "C-PEPAYA", name: "Olahan Daun Pepaya", description: "Olahan daun pepaya siap santap.", price: 12000, unit: "bungkus", stock: 4, status: "PUBLISHED", imageUrl: "/produk/daun-pepaya.svg" },
    { id: "P-TELANG", producerId: "PR-TELANG", categoryId: "C-TELANG", name: "Bunga Telang Kering", description: "Bunga telang kering untuk diseduh.", price: 18000, unit: "bungkus", stock: 10, status: "PUBLISHED", imageUrl: "/produk/bunga-telang.svg" },
    { id: "P-LAHANG", producerId: "PR-LAHANG", categoryId: "C-MINUM", name: "Lahang", description: "Minuman nira aren.", price: 8000, unit: "botol", stock: 20, status: "DRAFT", imageUrl: "/produk/lahang.svg" },
  ];

  // Stok awal dan penjualan contoh dicatat sebagai pergerakan supaya angka stok bisa ditelusuri.
  const movements: Movement[] = products.map((p, i) => ({
    id: `M-CONTOH-${i}`,
    productId: p.id,
    type: p.harvestId ? "PRODUCTION" : "INITIAL",
    qty: p.stock,
    note: p.harvestId ? `Panen ${p.harvestId}` : "Stok awal",
    createdAt: ago(24 * 12),
  }));
  const sales: Sale[] = [];
  const sell = (productId: string, qty: number, daysAgo: number) => {
    const p = products.find((x) => x.id === productId)!;
    const date = ago(daysAgo * 24 + 2);
    p.stock -= qty;
    movements.push({ id: `M-CONTOH-${movements.length}`, productId, type: "SALE", qty: -qty, note: "Penjualan langsung", createdAt: date });
    sales.push({
      id: `S-CONTOH-${sales.length}`,
      producerId: p.producerId,
      items: [{ productId, name: p.name, price: p.price, unit: p.unit, qty }],
      total: p.price * qty,
      date,
      note: "Penjualan langsung",
    });
  };
  sell("P-ABON", 3, 9);
  sell("P-BOLA", 2, 7);
  sell("P-DAUN", 4, 6); // stok jadi 0, untuk contoh tampilan "Stok habis"
  sell("P-ABON", 2, 5);
  sell("P-TELANG", 1, 4);
  sell("P-ABON", 4, 2);
  sell("P-PAKCOY", 2, 1);
  sell("P-BOLA", 3, 0);

  const user = (id: string, name: string, email: string, role: Db["users"][number]["role"], producerId?: string) => ({
    id,
    name,
    email,
    password: DEMO_PASSWORD,
    role,
    producerId,
  });
  const producer = (id: string, type: "KWT" | "UMKM", name: string, wa: string, description: string, verified = true) => ({
    id,
    type,
    name,
    whatsapp: wa,
    description,
    location: "Desa Cinanjung, Kabupaten Sumedang",
    verified,
    nib: "",
    pirt: "",
    halal: "",
  });

  return {
    session: null,
    users: [
      user("U-ADMIN", "Super Admin", "admin@cinanjung.test", "SUPER_ADMIN"),
      user("U-KWT", "Admin KWT Bidara", "kwt@cinanjung.test", "ADMIN_KWT", "PR-KWT"),
      user("U-OPERATOR", "Operator KWT Bidara", "operator@cinanjung.test", "OPERATOR_KWT", "PR-KWT"),
      user("U-UMKM", "Admin UMKM Olahan Pepaya", "umkm@cinanjung.test", "ADMIN_UMKM", "PR-PEPAYA"),
      user("U-DESA", "Pemerintah Desa Cinanjung", "desa@cinanjung.test", "PEMDES"),
    ],
    producers: [
      producer("PR-KWT", "KWT", "KWT Bidara", "6281200000001", "Kelompok Wanita Tani pengelola greenhouse dan hidroponik Desa Cinanjung."),
      producer("PR-PEPAYA", "UMKM", "UMKM Olahan Pepaya (contoh)", "6281200000002", "Pengolah pepaya menjadi abon, bola-bola abon, dan olahan daun pepaya."),
      producer("PR-TELANG", "UMKM", "UMKM Bunga Telang (contoh)", "6281200000003", "Pengolah bunga telang."),
      producer("PR-LAHANG", "UMKM", "UMKM Lahang (contoh)", "6281200000004", "Penjual lahang dari nira aren.", false),
    ],
    zones: [{ id: "Z-1", name: "Greenhouse KWT Bidara", description: "Rak hidroponik utama" }],
    devices: [
      {
        id: "SG-KWT-001",
        zoneId: "Z-1",
        type: "ESP32 Smart Garden Node",
        status: "ONLINE",
        sensors: ["temperature", "humidity", "waterLevel"],
        failedSensors: [],
        lastSeen: readings[readings.length - 1].timestamp,
        hasPump: true,
        pumpOnSince: null,
        buffer: [],
      },
    ],
    readings,
    alerts: [],
    irrigationLogs: [],
    batches: [
      { id: "B-CONTOH-1", zoneId: "Z-1", cropName: "Pakcoy", plantingDate: day(45), seedCount: 120, medium: "Rockwool", active: false },
      { id: "B-CONTOH-2", zoneId: "Z-1", cropName: "Pakcoy", plantingDate: day(21), seedCount: 120, medium: "Rockwool", active: true },
      { id: "B-CONTOH-3", zoneId: "Z-1", cropName: "Selada", plantingDate: day(35), seedCount: 80, medium: "Rockwool", active: true },
    ],
    activities: [
      { id: "A-CONTOH-1", batchId: "B-CONTOH-2", date: day(21), type: "Penanaman", note: "Pindah tanam 120 bibit ke rak." },
      { id: "A-CONTOH-2", batchId: "B-CONTOH-2", date: day(14), type: "Penambahan nutrisi", note: "Tambah larutan nutrisi AB mix." },
      { id: "A-CONTOH-3", batchId: "B-CONTOH-2", date: day(7), type: "Penggantian air", note: "Kuras dan isi ulang tandon." },
    ],
    harvests: [
      { id: "H-CONTOH-1", batchId: "B-CONTOH-1", harvestDate: day(12), quantity: 10, unit: "kg", qualityNote: "2 kg tidak layak jual, dipakai sendiri.", availableQuantity: 8, status: "PUBLISHED", productId: "P-PAKCOY" },
      { id: "H-CONTOH-2", batchId: "B-CONTOH-3", harvestDate: day(0), quantity: 6, unit: "kg", qualityNote: "Daun segar, sebagian kecil berlubang.", availableQuantity: null, status: "PENDING_REVIEW" },
    ],
    categories: [
      { id: "C-HIDRO", name: "Sayuran hidroponik", group: "KEBUN" },
      { id: "C-KEBUN", name: "Hasil kebun lain", group: "KEBUN" },
      { id: "C-PEPAYA", name: "Olahan pepaya", group: "UMKM" },
      { id: "C-TELANG", name: "Olahan bunga telang", group: "UMKM" },
      { id: "C-MINUM", name: "Minuman tradisional", group: "UMKM" },
    ],
    products,
    movements,
    orders: [
      {
        id: "ORD-CONTOH-1",
        producerId: "PR-PEPAYA",
        customerName: "Ibu Sari (contoh)",
        customerAddress: "RT 02 RW 05, Desa Cinanjung",
        items: [{ productId: "P-ABON", name: "Abon Pepaya", price: 25000, unit: "bungkus", qty: 2 }],
        total: 50000,
        status: "INQUIRY",
        createdAt: ago(2),
        updatedAt: ago(2),
      },
      {
        id: "ORD-CONTOH-2",
        producerId: "PR-KWT",
        customerName: "Pak Dedi (contoh)",
        customerAddress: "RT 01 RW 03, Desa Cinanjung",
        items: [{ productId: "P-PAKCOY", name: "Pakcoy Hidroponik", price: 20000, unit: "kg", qty: 1 }],
        total: 20000,
        status: "PENDING_CONFIRMATION",
        createdAt: ago(5),
        updatedAt: ago(4),
      },
    ],
    sales,
    legalGuides: [
      {
        id: "L-NIB",
        title: "NIB (Nomor Induk Berusaha)",
        content:
          "NIB adalah identitas pelaku usaha yang diterbitkan lewat sistem OSS (oss.go.id). Usaha mikro dan kecil bisa mendaftar sendiri secara daring dengan NIK, alamat usaha, dan jenis kegiatan usaha. Setelah terbit, isi nomor NIB di menu Profil usaha supaya tampil di halaman produk Anda.",
      },
      {
        id: "L-PIRT",
        title: "SPP-IRT (PIRT)",
        content:
          "SPP-IRT, sering disebut PIRT, adalah izin edar untuk pangan olahan produksi rumah tangga. Pengajuannya lewat OSS setelah punya NIB, lalu pemenuhan syaratnya (misalnya penyuluhan keamanan pangan dan pemeriksaan tempat produksi) diurus bersama Dinas Kesehatan kabupaten. Tidak semua jenis pangan boleh memakai SPP-IRT, jadi tanyakan dulu jenis produk Anda ke Dinas Kesehatan Kabupaten Sumedang.",
      },
      {
        id: "L-HALAL",
        title: "Sertifikat halal",
        content:
          "Sertifikat halal diterbitkan oleh BPJPH. Usaha mikro dan kecil dengan bahan dan proses yang sederhana dapat mengajukan lewat jalur pernyataan pelaku usaha (self declare) dengan bantuan pendamping proses produk halal, melalui aplikasi SIHALAL (ptsp.halal.go.id). Produk di luar kriteria itu memakai jalur reguler dengan pemeriksaan lembaga pemeriksa halal.",
      },
    ],
    config: {
      // Ambang awal ini hanya contoh. Ambang budidaya harus ditentukan dari jenis tanaman dan sistem yang dipakai KWT.
      thresholds: {
        temperature: { min: 18, max: 32 },
        humidity: { min: 50, max: 90 },
        waterLevel: { min: 30, max: 100 },
        soilMoisture: { min: 40, max: 80 },
        ph: { min: 5.5, max: 6.5 },
        ec: { min: 1, max: 2.5 },
      },
      pumpMaxMinutes: 10,
      minWaterForPump: 30,
      staleMinutes: 5,
    },
  };
}
