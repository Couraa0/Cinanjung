// Hash kata sandi dengan scrypt bawaan Node, tanpa library tambahan.
// Format tersimpan: scrypt$<salt base64>$<hash base64>
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    // N = 2^15 sesuai saran OWASP untuk scrypt; maxmem dinaikkan karena bawaan Node terlalu kecil untuk N ini.
    scrypt(password, salt, KEYLEN, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64")}$${(await derive(password, salt)).toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await derive(password, Buffer.from(salt, "base64"));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
