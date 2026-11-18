// Skema database. Sumber: MASTER BLUEPRINT bagian 8 + tabel tambahan dari Technical Workflow.
// Bedanya dengan blueprint (disengaja):
// - `roles` jadi enum, karena perannya tetap lima.
// - `inventory` digabung ke kolom `products.stock`, karena satu produk hanya punya satu stok aktif.
//   Riwayatnya tetap lengkap di `inventory_movements`.
// - `sensor_readings` memakai satu kolom per parameter (bukan baris parameter/nilai), sama dengan payload ESP32.
// - Hubungan panen → produk disimpan di `harvest_records.product_id` (satu produk bisa menampung beberapa panen).
// ID berupa teks supaya data contoh (P-ABON, ORD-...) tetap sama; ID baru dibuat oleh aplikasi.
// Setelah mengubah file ini: npm run db:generate, lalu npm run db:migrate.
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------- Enum ----------

export const role = pgEnum("role", ["SUPER_ADMIN", "ADMIN_KWT", "OPERATOR_KWT", "ADMIN_UMKM", "PEMDES"]);
export const producerType = pgEnum("producer_type", ["KWT", "UMKM"]);
export const sensorKey = pgEnum("sensor_key", ["temperature", "humidity", "waterLevel", "soilMoisture", "ph", "ec"]);
export const deviceStatus = pgEnum("device_status", ["ONLINE", "OFFLINE", "SENSOR_ERROR"]);
export const pumpStopReason = pgEnum("pump_stop_reason", ["DIHENTIKAN", "BATAS_WAKTU", "AIR_RENDAH", "SENSOR_ERROR"]);
export const harvestStatus = pgEnum("harvest_status", ["HARVESTED", "PENDING_REVIEW", "APPROVED", "PUBLISHED"]);
export const categoryGroup = pgEnum("category_group", ["KEBUN", "UMKM"]);
export const productStatus = pgEnum("product_status", ["DRAFT", "PUBLISHED", "INACTIVE"]);
export const movementType = pgEnum("movement_type", ["INITIAL", "PRODUCTION", "SALE", "ADJUSTMENT", "RETURN"]);
export const orderStatus = pgEnum("order_status", [
  "INQUIRY",
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "PROCESSING",
  "COMPLETED",
  "CANCELLED",
]);

// ---------- Kolom bersama ----------

const id = () => text("id").primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
/** Jumlah barang (kg, bungkus, botol). Dua desimal cukup untuk 0,5 kg. */
const qty = (name: string) => numeric(name, { precision: 12, scale: 2, mode: "number" });

// ---------- Pengguna dan produsen ----------

export const producers = pgTable("producers", {
  id: id(),
  type: producerType("type").notNull(),
  name: text("name").notNull(),
  whatsapp: text("whatsapp").notNull(),
  description: text("description").notNull().default(""),
  location: text("location").notNull().default(""),
  verified: boolean("verified").notNull().default(false),
  nib: text("nib").notNull().default(""),
  pirt: text("pirt").notNull().default(""),
  halal: text("halal").notNull().default(""),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const users = pgTable(
  "users",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: role("role").notNull(),
    producerId: text("producer_id").references(() => producers.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`),
    // Peran KWT dan UMKM wajib terhubung ke produsen; peran lain tidak boleh.
    check(
      "users_producer_matches_role",
      sql`(${t.role} in ('ADMIN_KWT', 'OPERATOR_KWT', 'ADMIN_UMKM')) = (${t.producerId} is not null)`,
    ),
  ],
);

/** Sesi login. Yang disimpan hash token, bukan tokennya, supaya kebocoran database tidak membuka sesi. */
export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

// ---------- Smart Garden ----------

export const gardenZones = pgTable("garden_zones", {
  id: id(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  createdAt: createdAt(),
});

export const devices = pgTable("devices", {
  id: id(), // contoh: SG-KWT-001, sama dengan yang ditanam di firmware
  zoneId: text("zone_id")
    .notNull()
    .references(() => gardenZones.id, { onDelete: "restrict" }),
  deviceType: text("device_type").notNull(),
  /** Hash token perangkat. Null = belum diberi token, perangkat belum bisa mengirim data. */
  tokenHash: text("token_hash").unique(),
  sensors: sensorKey("sensors").array().notNull().default(sql`'{}'`),
  failedSensors: sensorKey("failed_sensors").array().notNull().default(sql`'{}'`),
  status: deviceStatus("status").notNull().default("OFFLINE"),
  lastSeen: timestamp("last_seen", { withTimezone: true }),
  hasPump: boolean("has_pump").notNull().default(false),
  /** Perintah dari dashboard. ESP32 membacanya dari balasan setiap kali mengirim data. */
  pumpDesired: boolean("pump_desired").notNull().default(false),
  /** Kapan pompa benar-benar menyala, menurut laporan perangkat. */
  pumpOnSince: timestamp("pump_on_since", { withTimezone: true }),
  createdAt: createdAt(),
});

export const sensorReadings = pgTable(
  "sensor_readings",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    deviceId: text("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    /** Waktu pembacaan menurut perangkat. */
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    // Null = sensor tidak dipasang atau gagal membaca. Jangan pernah diisi 0 sebagai pengganti.
    temperature: real("temperature"),
    humidity: real("humidity"),
    waterLevel: real("water_level"),
    soilMoisture: real("soil_moisture"),
    ph: real("ph"),
    ec: real("ec"),
    /** Dikirim ulang setelah Wi-Fi pulih. */
    late: boolean("late").notNull().default(false),
  },
  // Pembacaan ganda dari perangkat yang sama di waktu yang sama ditolak database.
  (t) => [uniqueIndex("sensor_readings_device_time_idx").on(t.deviceId, t.recordedAt)],
);

export const alertLogs = pgTable(
  "alert_logs",
  {
    id: id(),
    deviceId: text("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    /** Nama sensor, atau "pump" untuk peringatan pompa. */
    parameter: text("parameter").notNull(),
    message: text("message").notNull(),
    createdAt: createdAt(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [index("alert_logs_created_idx").on(t.createdAt)],
);

export const irrigationLogs = pgTable("irrigation_logs", {
  id: id(),
  deviceId: text("device_id")
    .notNull()
    .references(() => devices.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  durationSec: integer("duration_sec").notNull(),
  stopReason: pumpStopReason("stop_reason").notNull(),
});

export const plantBatches = pgTable(
  "plant_batches",
  {
    id: id(),
    zoneId: text("zone_id")
      .notNull()
      .references(() => gardenZones.id, { onDelete: "restrict" }),
    cropName: text("crop_name").notNull(),
    plantingDate: date("planting_date").notNull(),
    seedCount: integer("seed_count").notNull(),
    medium: text("medium").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [check("plant_batches_seed_count_positive", sql`${t.seedCount} > 0`)],
);

export const batchActivities = pgTable("batch_activities", {
  id: id(),
  batchId: text("batch_id")
    .notNull()
    .references(() => plantBatches.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  type: text("type").notNull(),
  note: text("note").notNull(),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

// ---------- Marketplace ----------

export const categories = pgTable("categories", {
  id: id(),
  name: text("name").notNull(),
  group: categoryGroup("group").notNull(),
});

export const products = pgTable(
  "products",
  {
    id: id(),
    producerId: text("producer_id")
      .notNull()
      .references(() => producers.id, { onDelete: "restrict" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    /** Harga dalam rupiah, bilangan bulat. */
    price: integer("price").notNull(),
    unit: text("unit").notNull(),
    /** Stok saat ini. Hanya boleh diubah bersama baris baru di inventory_movements. */
    stock: qty("stock").notNull().default(0),
    status: productStatus("status").notNull().default("DRAFT"),
    imageUrl: text("image_url").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("products_price_not_negative", sql`${t.price} >= 0`),
    // Pengaman terakhir: dua pesanan yang disetujui bersamaan tetap tidak bisa membuat stok minus.
    check("products_stock_not_negative", sql`${t.stock} >= 0`),
    index("products_producer_idx").on(t.producerId),
  ],
);

export const harvestRecords = pgTable(
  "harvest_records",
  {
    id: id(),
    batchId: text("batch_id")
      .notNull()
      .references(() => plantBatches.id, { onDelete: "restrict" }),
    harvestDate: date("harvest_date").notNull(),
    quantity: qty("quantity").notNull(),
    unit: text("unit").notNull(),
    qualityNote: text("quality_note").notNull().default(""),
    /** Jumlah layak jual, diisi saat verifikasi Admin KWT. */
    availableQuantity: qty("available_quantity"),
    status: harvestStatus("status").notNull().default("HARVESTED"),
    productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    check("harvest_quantity_positive", sql`${t.quantity} > 0`),
    check(
      "harvest_available_within_quantity",
      sql`${t.availableQuantity} is null or (${t.availableQuantity} >= 0 and ${t.availableQuantity} <= ${t.quantity})`,
    ),
  ],
);

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    type: movementType("type").notNull(),
    /** Positif menambah stok, negatif mengurangi. */
    qty: qty("qty").notNull(),
    note: text("note").notNull().default(""),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [check("inventory_movements_qty_not_zero", sql`${t.qty} <> 0`), index("inventory_movements_product_idx").on(t.productId)],
);

export const orders = pgTable(
  "orders",
  {
    id: id(),
    producerId: text("producer_id")
      .notNull()
      .references(() => producers.id, { onDelete: "restrict" }),
    customerName: text("customer_name").notNull(),
    customerAddress: text("customer_address").notNull(),
    total: integer("total").notNull(),
    status: orderStatus("status").notNull().default("INQUIRY"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("orders_producer_status_idx").on(t.producerId, t.status)],
);

/** Nama, harga, dan satuan disalin saat pesanan dibuat, supaya perubahan harga nanti tidak mengubah pesanan lama. */
export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    price: integer("price").notNull(),
    unit: text("unit").notNull(),
    qty: qty("qty").notNull(),
  },
  (t) => [check("order_items_qty_positive", sql`${t.qty} > 0`)],
);

/** Pembukuan. Yang dicatat omzet, bukan laba. */
export const salesRecords = pgTable(
  "sales_records",
  {
    id: id(),
    producerId: text("producer_id")
      .notNull()
      .references(() => producers.id, { onDelete: "restrict" }),
    /** Terisi kalau penjualan berasal dari pesanan WhatsApp. Satu pesanan hanya boleh tercatat sekali. */
    orderId: text("order_id")
      .unique()
      .references(() => orders.id, { onDelete: "restrict" }),
    total: integer("total").notNull(),
    soldAt: timestamp("sold_at", { withTimezone: true }).notNull(),
    note: text("note").notNull().default(""),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("sales_records_producer_sold_idx").on(t.producerId, t.soldAt)],
);

export const saleItems = pgTable(
  "sale_items",
  {
    id: id(),
    saleId: text("sale_id")
      .notNull()
      .references(() => salesRecords.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    price: integer("price").notNull(),
    unit: text("unit").notNull(),
    qty: qty("qty").notNull(),
  },
  (t) => [check("sale_items_qty_positive", sql`${t.qty} > 0`)],
);

export const legalGuides = pgTable("legal_guides", {
  id: id(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  sortOrder: smallint("sort_order").notNull().default(0),
});

// ---------- Konfigurasi ----------

/** Satu baris saja (id = 1). */
export const settings = pgTable(
  "settings",
  {
    id: smallint("id").primaryKey().default(1),
    thresholds: jsonb("thresholds").$type<Partial<Record<(typeof sensorKey.enumValues)[number], { min: number; max: number }>>>().notNull(),
    pumpMaxMinutes: integer("pump_max_minutes").notNull(),
    minWaterForPump: integer("min_water_for_pump").notNull(),
    staleMinutes: integer("stale_minutes").notNull(),
  },
  (t) => [check("settings_single_row", sql`${t.id} = 1`)],
);
