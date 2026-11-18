// Mengisi database dengan data contoh (sama dengan data contoh di frontend).
//   npm run db:seed            hanya jalan kalau database masih kosong
//   npm run db:seed -- --reset HAPUS semua isi tabel, lalu isi ulang
// Kata sandi akun demo di-hash dulu; nilainya ada di src/lib/seed.ts (DEMO_PASSWORD).
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { uid } from "../src/lib/logic.ts";
import { seed } from "../src/lib/seed.ts";
import * as t from "../src/server/db/schema.ts";
import { hashPassword } from "../src/server/password.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dipakai oleh driver postgres-js dan PGlite (uji lokal)
type AnyDb = PgDatabase<any, typeof t>;

export async function seedDb(db: AnyDb, { reset = false } = {}) {
  const tables = Object.values(t).filter((x) => typeof x === "object" && x !== null && Symbol.for("drizzle:IsDrizzleTable") in x);
  if (reset) {
    const names = tables.map((x) => `"${(x as unknown as { [k: symbol]: string })[Symbol.for("drizzle:Name")]}"`).join(", ");
    await db.execute(sql.raw(`truncate ${names} restart identity cascade`));
  } else {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.users);
    if (n > 0) throw new Error("Database sudah berisi data. Pakai `npm run db:seed -- --reset` untuk menghapus dan mengisi ulang.");
  }

  const d = seed();
  const hashes = new Map(await Promise.all([...new Set(d.users.map((u) => u.password))].map(async (p) => [p, await hashPassword(p)] as const)));

  await db.transaction(async (tx) => {
    await tx.insert(t.producers).values(d.producers);
    await tx.insert(t.users).values(
      d.users.map((u) => ({ id: u.id, name: u.name, email: u.email, passwordHash: hashes.get(u.password)!, role: u.role, producerId: u.producerId ?? null })),
    );
    await tx.insert(t.gardenZones).values(d.zones);
    await tx.insert(t.devices).values(
      d.devices.map((x) => ({
        id: x.id,
        zoneId: x.zoneId,
        deviceType: x.type,
        sensors: x.sensors,
        failedSensors: x.failedSensors,
        status: x.status,
        lastSeen: x.lastSeen ? new Date(x.lastSeen) : null,
        hasPump: x.hasPump,
      })),
    );
    await tx.insert(t.sensorReadings).values(
      d.readings.map((r) => ({
        deviceId: r.deviceId,
        recordedAt: new Date(r.timestamp),
        temperature: r.temperature,
        humidity: r.humidity,
        waterLevel: r.waterLevel,
        soilMoisture: r.soilMoisture,
        ph: r.ph,
        ec: r.ec,
      })),
    );
    await tx.insert(t.plantBatches).values(d.batches);
    await tx.insert(t.batchActivities).values(d.activities);
    await tx.insert(t.categories).values(d.categories);
    await tx.insert(t.products).values(d.products.map((p) => ({ ...p, harvestId: undefined })));
    await tx.insert(t.harvestRecords).values(d.harvests.map((h) => ({ ...h, productId: h.productId ?? null })));
    await tx.insert(t.inventoryMovements).values(d.movements.map((m) => ({ ...m, createdAt: new Date(m.createdAt) })));
    for (const o of d.orders) {
      await tx.insert(t.orders).values({ ...o, createdAt: new Date(o.createdAt), updatedAt: new Date(o.updatedAt) });
      await tx.insert(t.orderItems).values(o.items.map((i) => ({ ...i, id: uid("OI"), orderId: o.id })));
    }
    for (const s of d.sales) {
      await tx.insert(t.salesRecords).values({ id: s.id, producerId: s.producerId, orderId: s.orderId ?? null, total: s.total, soldAt: new Date(s.date), note: s.note ?? "" });
      await tx.insert(t.saleItems).values(s.items.map((i) => ({ ...i, id: uid("SI"), saleId: s.id })));
    }
    await tx.insert(t.legalGuides).values(d.legalGuides.map((g, i) => ({ ...g, sortOrder: i })));
    await tx.insert(t.settings).values({ id: 1, ...d.config });
  });
  return { users: d.users.length, products: d.products.length, readings: d.readings.length };
}

// Dijalankan langsung lewat `npm run db:seed`.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // pakai env sistem
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diisi di .env.local.");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { default: postgres } = await import("postgres");
  const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  try {
    const n = await seedDb(drizzle(client, { schema: t }), { reset: process.argv.includes("--reset") });
    console.log(`OK: ${n.users} akun, ${n.products} produk, ${n.readings} pembacaan sensor contoh.`);
  } finally {
    await client.end();
  }
}
