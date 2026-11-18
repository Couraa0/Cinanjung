import { defineConfig } from "drizzle-kit";

// drizzle-kit tidak membaca .env.local sendiri.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Tidak ada .env.local (misalnya di Vercel): pakai env dari sistem.
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
});
