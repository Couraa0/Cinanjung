// Bentuk data mengikuti "Master Database Blueprint" (bagian 8) + tabel tambahan dari Technical Workflow
// (alert_logs, inventory_movements). Nama field camelCase; pemetaan ke snake_case jadi urusan backend nanti.

export type Role = "SUPER_ADMIN" | "ADMIN_KWT" | "OPERATOR_KWT" | "ADMIN_UMKM" | "PEMDES";

export type User = { id: string; name: string; email: string; password: string; role: Role; producerId?: string };

export type Producer = {
  id: string;
  type: "KWT" | "UMKM";
  name: string;
  whatsapp: string;
  description: string;
  location: string;
  verified: boolean;
  nib: string;
  pirt: string;
  halal: string;
};

export type Zone = { id: string; name: string; description: string };

export type SensorKey = "temperature" | "humidity" | "waterLevel" | "soilMoisture" | "ph" | "ec";
export type SensorValues = Record<SensorKey, number | null>;
export type ReadingPayload = { deviceId: string; timestamp: string; values: Partial<SensorValues>; late?: boolean };

export type Device = {
  id: string;
  zoneId: string;
  type: string;
  status: "ONLINE" | "OFFLINE" | "SENSOR_ERROR";
  sensors: SensorKey[]; // sensor yang benar-benar dipasang; sisanya dikirim null
  failedSensors: SensorKey[];
  lastSeen: string | null;
  hasPump: boolean;
  pumpOnSince: string | null;
  buffer: ReadingPayload[]; // pembacaan yang tertahan saat Wi-Fi putus (simulasi memori ESP32)
};

export type Reading = SensorValues & { id: string; deviceId: string; timestamp: string; late?: boolean };

export type Alert = {
  id: string;
  deviceId: string;
  parameter: SensorKey | "pump";
  message: string;
  timestamp: string;
  read: boolean;
};

export type IrrigationLog = {
  id: string;
  deviceId: string;
  startedAt: string;
  durationSec: number;
  status: "DIHENTIKAN" | "BATAS_WAKTU" | "AIR_RENDAH" | "SENSOR_ERROR";
};

export type Batch = {
  id: string;
  zoneId: string;
  cropName: string;
  plantingDate: string;
  seedCount: number;
  medium: string;
  active: boolean;
};

export type Activity = { id: string; batchId: string; date: string; type: string; note: string };

export type HarvestStatus = "HARVESTED" | "PENDING_REVIEW" | "APPROVED" | "PUBLISHED";
export type Harvest = {
  id: string;
  batchId: string;
  harvestDate: string;
  quantity: number;
  unit: string;
  qualityNote: string;
  availableQuantity: number | null; // jumlah layak jual, diisi saat verifikasi
  status: HarvestStatus;
  productId?: string;
};

export type Category = { id: string; name: string; group: "KEBUN" | "UMKM" };

// "Out of Stock" tidak disimpan: dihitung dari PUBLISHED + stok 0 (lihat productStatus di logic.ts).
export type ProductStatus = "DRAFT" | "PUBLISHED" | "INACTIVE";
export type Product = {
  id: string;
  producerId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  stock: number;
  status: ProductStatus;
  imageUrl: string;
  harvestId?: string;
};

export type MovementType = "INITIAL" | "PRODUCTION" | "SALE" | "ADJUSTMENT" | "RETURN";
export type Movement = { id: string; productId: string; type: MovementType; qty: number; note: string; createdAt: string };

export type OrderStatus = "INQUIRY" | "PENDING_CONFIRMATION" | "CONFIRMED" | "PROCESSING" | "COMPLETED" | "CANCELLED";
export type OrderItem = { productId: string; name: string; price: number; unit: string; qty: number };
export type Order = {
  id: string;
  producerId: string;
  customerName: string;
  customerAddress: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

export type Sale = { id: string; producerId: string; orderId?: string; items: OrderItem[]; total: number; date: string; note?: string };

export type LegalGuide = { id: string; title: string; content: string };

export type Config = {
  thresholds: Partial<Record<SensorKey, { min: number; max: number }>>;
  pumpMaxMinutes: number;
  minWaterForPump: number;
  staleMinutes: number;
};

export type Db = {
  session: string | null;
  users: User[];
  producers: Producer[];
  zones: Zone[];
  devices: Device[];
  readings: Reading[];
  alerts: Alert[];
  irrigationLogs: IrrigationLog[];
  batches: Batch[];
  activities: Activity[];
  harvests: Harvest[];
  categories: Category[];
  products: Product[];
  movements: Movement[];
  orders: Order[];
  sales: Sale[];
  legalGuides: LegalGuide[];
  config: Config;
};
