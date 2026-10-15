import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
export const hashToken = (value) =>
  createHash("sha256").update(value).digest("hex");
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 64, {
    N: 32768,
    maxmem: 64 * 1024 * 1024,
  });
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password, encoded) {
  const [salt, expected] = encoded.split(":");
  const key = await derive(password, salt, 64, {
    N: 32768,
    maxmem: 64 * 1024 * 1024,
  });
  return timingSafeEqual(key, Buffer.from(expected, "hex"));
}
export const validPassword = (password) =>
  typeof password === "string" &&
  password.length >= 12 &&
  password.length <= 128;
export function createSession(db, userId) {
  const token = randomBytes(32).toString("base64url");
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
  db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(
    hashToken(token),
    userId,
    Date.now() + 7 * 86400000,
  );
  return token;
}
