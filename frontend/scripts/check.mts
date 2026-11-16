// Cek aturan bisnis di src/lib/logic.ts. Jalankan: npm run check
import assert from "node:assert/strict";
import * as L from "../src/lib/logic.ts";
import { seed } from "../src/lib/seed.ts";

const d = seed(Date.parse("2026-11-16T10:00:00+07:00"));
const at = "2026-11-16T03:00:00.000Z";
const abon = d.products.find((p) => p.id === "P-ABON")!;
const stock0 = abon.stock;
const pesan = (qty: number) =>
  L.createOrder(d, { productId: abon.id, qty, customerName: "Uji", customerAddress: "Cinanjung" }, at);

// Stok contoh cocok dengan riwayat pergerakannya.
for (const p of d.products) {
  const total = d.movements.filter((m) => m.productId === p.id).reduce((s, m) => s + m.qty, 0);
  assert.equal(p.stock, total, `stok ${p.id} harus sama dengan jumlah pergerakan`);
}

// Checkout WhatsApp membuat INQUIRY tanpa mengurangi stok.
const o1 = pesan(2);
assert.equal(o1.status, "INQUIRY");
assert.equal(abon.stock, stock0);
assert.match(L.waMessage(o1), /Produk: Abon Pepaya\nJumlah: 2 bungkus\nHarga: Rp25\.000\/bungkus\nTotal estimasi: Rp50\.000/);
assert.ok(L.waLink("0812-0000-0002", "a b").startsWith("https://wa.me/6281200000002?text=a%20b"));

// Disetujui → stok berkurang. Dibatalkan → stok kembali. Status akhir tidak bisa diubah lagi.
L.setOrderStatus(d, o1.id, "CONFIRMED", at);
assert.equal(abon.stock, stock0 - 2);
L.setOrderStatus(d, o1.id, "CANCELLED", at);
assert.equal(abon.stock, stock0);
assert.throws(() => L.setOrderStatus(d, o1.id, "CONFIRMED", at));

// Stok tidak boleh minus, dari jalur mana pun.
assert.throws(() => pesan(stock0 + 1));
assert.throws(() => L.moveStock(d, abon.id, "ADJUSTMENT", -(stock0 + 1), "uji", at));
assert.throws(() => L.recordSale(d, { productId: abon.id, qty: stock0 + 1, date: at, note: "" }));
assert.equal(abon.stock, stock0);

// Selesai → masuk pembukuan tepat satu kali, tanpa memotong stok dua kali.
const o2 = pesan(3);
const sales0 = d.sales.length;
L.setOrderStatus(d, o2.id, "CONFIRMED", at);
L.setOrderStatus(d, o2.id, "PROCESSING", at);
L.setOrderStatus(d, o2.id, "COMPLETED", at);
assert.equal(d.sales.length, sales0 + 1);
assert.equal(d.sales.at(-1)!.total, 75000);
assert.equal(abon.stock, stock0 - 3);

// Panen yang belum diverifikasi tidak bisa masuk katalog; setelah terbit statusnya PUBLISHED.
L.recordHarvest(d, { batchId: "B-CONTOH-2", harvestDate: "2026-11-16", quantity: 10, unit: "kg", qualityNote: "" });
const h = d.harvests.at(-1)!;
assert.throws(() => L.harvestToCatalog(d, h.id, "PR-KWT", at));
L.submitHarvest(d, h.id);
assert.throws(() => L.approveHarvest(d, h.id, 11));
L.approveHarvest(d, h.id, 8);
const pid = L.harvestToCatalog(d, h.id, "PR-KWT", at);
const draft = d.products.find((p) => p.id === pid)!;
assert.deepEqual([draft.status, draft.stock, draft.harvestId], ["DRAFT", 8, h.id]);
assert.throws(() => L.publishProduct(d, pid), /harga/);
draft.price = 20000;
L.publishProduct(d, pid);
assert.equal(h.status, "PUBLISHED");
assert.throws(() => L.publishProduct(d, "P-LAHANG"), /belum diverifikasi/);

// IoT: duplikat diabaikan, ambang memicu satu peringatan, satu sensor rusak tidak mematikan sensor lain.
const dev = d.devices[0];
const baca = (menit: number, values: Partial<Record<"temperature" | "humidity" | "waterLevel", number | null>>) =>
  L.ingestReading(d, { deviceId: dev.id, timestamp: `2026-11-16T04:${String(menit).padStart(2, "0")}:00.000Z`, values });
assert.equal(baca(0, { temperature: 28, humidity: 70, waterLevel: 60 }), true);
assert.equal(baca(0, { temperature: 28, humidity: 70, waterLevel: 60 }), false);
baca(1, { temperature: 35, humidity: 70, waterLevel: 60 });
baca(2, { temperature: 36, humidity: 70, waterLevel: 60 });
assert.equal(d.alerts.filter((a) => a.parameter === "temperature").length, 1);
baca(3, { temperature: null, humidity: 71, waterLevel: 60 });
assert.equal(dev.status, "SENSOR_ERROR");
assert.equal(L.latestReading(d, dev.id)!.humidity, 71);
assert.throws(() => L.pumpOn(d, dev.id, at), /online/);
assert.throws(() => L.ingestReading(d, { deviceId: "TIDAK-ADA", timestamp: at, values: {} }));

// Pompa: tidak menyala saat air rendah, mati sendiri saat air turun atau batas waktu tercapai.
baca(4, { temperature: 28, humidity: 70, waterLevel: 20 });
assert.throws(() => L.pumpOn(d, dev.id, at), /Air tandon/);
baca(5, { temperature: 28, humidity: 70, waterLevel: 60 });
L.pumpOn(d, dev.id, "2026-11-16T04:05:00.000Z");
baca(6, { temperature: 28, humidity: 70, waterLevel: 25 });
assert.equal(dev.pumpOnSince, null);
assert.equal(d.irrigationLogs.at(-1)!.status, "AIR_RENDAH");
baca(7, { temperature: 28, humidity: 70, waterLevel: 60 });
L.pumpOn(d, dev.id, "2026-11-16T04:07:00.000Z");
L.pumpTick(d, "2026-11-16T04:16:59.000Z");
assert.ok(dev.pumpOnSince);
L.pumpTick(d, "2026-11-16T04:30:00.000Z");
assert.equal(dev.pumpOnSince, null);
assert.deepEqual([d.irrigationLogs.at(-1)!.status, d.irrigationLogs.at(-1)!.durationSec], ["BATAS_WAKTU", 600]);

// Wi-Fi putus: pembacaan ditahan, lalu masuk sebagai data terlambat saat koneksi pulih.
const n0 = d.readings.length;
const t0 = Date.parse("2026-11-16T05:00:00.000Z");
L.simulateTick(d, dev.id, "WIFI_PUTUS", t0);
L.simulateTick(d, dev.id, "WIFI_PUTUS", t0 + 15000);
assert.deepEqual([dev.status, d.readings.length, dev.buffer.length], ["OFFLINE", n0, 2]);
L.simulateTick(d, dev.id, "NORMAL", t0 + 30000);
assert.deepEqual([dev.status, d.readings.length, dev.buffer.length], ["ONLINE", n0 + 3, 0]);
assert.equal(d.readings.filter((r) => r.late).length, 2);

console.log("OK: semua aturan bisnis lolos.");
