import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-cbc";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY must be a 64-char hex string. Generate: openssl rand -hex 32");
    }
    // Dev fallback — insecure but non-blocking
    return Buffer.from("a".repeat(64), "hex");
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(text: string): string {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(text: string): string {
  // Handle plain-text (legacy / unencrypted values)
  if (!text || !text.includes(":") || text.split(":")[0].length !== 32) return text;
  const key = getKey();
  const [ivHex, encHex] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv(ALGO, key, iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function safeDecrypt(text: string | null | undefined): string | null {
  if (!text) return null;
  try { return decrypt(text); } catch { return null; }
}
