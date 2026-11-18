CREATE TYPE "public"."category_group" AS ENUM('KEBUN', 'UMKM');--> statement-breakpoint
CREATE TYPE "public"."device_status" AS ENUM('ONLINE', 'OFFLINE', 'SENSOR_ERROR');--> statement-breakpoint
CREATE TYPE "public"."harvest_status" AS ENUM('HARVESTED', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('INITIAL', 'PRODUCTION', 'SALE', 'ADJUSTMENT', 'RETURN');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('INQUIRY', 'PENDING_CONFIRMATION', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."producer_type" AS ENUM('KWT', 'UMKM');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('DRAFT', 'PUBLISHED', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."pump_stop_reason" AS ENUM('DIHENTIKAN', 'BATAS_WAKTU', 'AIR_RENDAH', 'SENSOR_ERROR');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('SUPER_ADMIN', 'ADMIN_KWT', 'OPERATOR_KWT', 'ADMIN_UMKM', 'PEMDES');--> statement-breakpoint
CREATE TYPE "public"."sensor_key" AS ENUM('temperature', 'humidity', 'waterLevel', 'soilMoisture', 'ph', 'ec');--> statement-breakpoint
CREATE TABLE "alert_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"parameter" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "batch_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"date" date NOT NULL,
	"type" text NOT NULL,
	"note" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"group" "category_group" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" text PRIMARY KEY NOT NULL,
	"zone_id" text NOT NULL,
	"device_type" text NOT NULL,
	"token_hash" text,
	"sensors" "sensor_key"[] DEFAULT '{}' NOT NULL,
	"failed_sensors" "sensor_key"[] DEFAULT '{}' NOT NULL,
	"status" "device_status" DEFAULT 'OFFLINE' NOT NULL,
	"last_seen" timestamp with time zone,
	"has_pump" boolean DEFAULT false NOT NULL,
	"pump_desired" boolean DEFAULT false NOT NULL,
	"pump_on_since" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "garden_zones" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "harvest_records" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"harvest_date" date NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"unit" text NOT NULL,
	"quality_note" text DEFAULT '' NOT NULL,
	"available_quantity" numeric(12, 2),
	"status" "harvest_status" DEFAULT 'HARVESTED' NOT NULL,
	"product_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "harvest_quantity_positive" CHECK ("harvest_records"."quantity" > 0),
	CONSTRAINT "harvest_available_within_quantity" CHECK ("harvest_records"."available_quantity" is null or ("harvest_records"."available_quantity" >= 0 and "harvest_records"."available_quantity" <= "harvest_records"."quantity"))
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"type" "movement_type" NOT NULL,
	"qty" numeric(12, 2) NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_movements_qty_not_zero" CHECK ("inventory_movements"."qty" <> 0)
);
--> statement-breakpoint
CREATE TABLE "irrigation_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"duration_sec" integer NOT NULL,
	"stop_reason" "pump_stop_reason" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_guides" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"unit" text NOT NULL,
	"qty" numeric(12, 2) NOT NULL,
	CONSTRAINT "order_items_qty_positive" CHECK ("order_items"."qty" > 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"producer_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_address" text NOT NULL,
	"total" integer NOT NULL,
	"status" "order_status" DEFAULT 'INQUIRY' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"zone_id" text NOT NULL,
	"crop_name" text NOT NULL,
	"planting_date" date NOT NULL,
	"seed_count" integer NOT NULL,
	"medium" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plant_batches_seed_count_positive" CHECK ("plant_batches"."seed_count" > 0)
);
--> statement-breakpoint
CREATE TABLE "producers" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "producer_type" NOT NULL,
	"name" text NOT NULL,
	"whatsapp" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"nib" text DEFAULT '' NOT NULL,
	"pirt" text DEFAULT '' NOT NULL,
	"halal" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"producer_id" text NOT NULL,
	"category_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" integer NOT NULL,
	"unit" text NOT NULL,
	"stock" numeric(12, 2) DEFAULT 0 NOT NULL,
	"status" "product_status" DEFAULT 'DRAFT' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_price_not_negative" CHECK ("products"."price" >= 0),
	CONSTRAINT "products_stock_not_negative" CHECK ("products"."stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" text PRIMARY KEY NOT NULL,
	"sale_id" text NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"unit" text NOT NULL,
	"qty" numeric(12, 2) NOT NULL,
	CONSTRAINT "sale_items_qty_positive" CHECK ("sale_items"."qty" > 0)
);
--> statement-breakpoint
CREATE TABLE "sales_records" (
	"id" text PRIMARY KEY NOT NULL,
	"producer_id" text NOT NULL,
	"order_id" text,
	"total" integer NOT NULL,
	"sold_at" timestamp with time zone NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_records_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "sensor_readings" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sensor_readings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"device_id" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"temperature" real,
	"humidity" real,
	"water_level" real,
	"soil_moisture" real,
	"ph" real,
	"ec" real,
	"late" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"thresholds" jsonb NOT NULL,
	"pump_max_minutes" integer NOT NULL,
	"min_water_for_pump" integer NOT NULL,
	"stale_minutes" integer NOT NULL,
	CONSTRAINT "settings_single_row" CHECK ("settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"producer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_producer_matches_role" CHECK (("users"."role" in ('ADMIN_KWT', 'OPERATOR_KWT', 'ADMIN_UMKM')) = ("users"."producer_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "alert_logs" ADD CONSTRAINT "alert_logs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_activities" ADD CONSTRAINT "batch_activities_batch_id_plant_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."plant_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_activities" ADD CONSTRAINT "batch_activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_zone_id_garden_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."garden_zones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvest_records" ADD CONSTRAINT "harvest_records_batch_id_plant_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."plant_batches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvest_records" ADD CONSTRAINT "harvest_records_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "irrigation_logs" ADD CONSTRAINT "irrigation_logs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_producer_id_producers_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_batches" ADD CONSTRAINT "plant_batches_zone_id_garden_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."garden_zones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_producer_id_producers_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_records_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_records" ADD CONSTRAINT "sales_records_producer_id_producers_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_records" ADD CONSTRAINT "sales_records_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_records" ADD CONSTRAINT "sales_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_producer_id_producers_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."producers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alert_logs_created_idx" ON "alert_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inventory_movements_product_idx" ON "inventory_movements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_producer_status_idx" ON "orders" USING btree ("producer_id","status");--> statement-breakpoint
CREATE INDEX "products_producer_idx" ON "products" USING btree ("producer_id");--> statement-breakpoint
CREATE INDEX "sales_records_producer_sold_idx" ON "sales_records" USING btree ("producer_id","sold_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sensor_readings_device_time_idx" ON "sensor_readings" USING btree ("device_id","recorded_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_idx" ON "users" USING btree (lower("email"));