import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { getAdminPasswordHash } from "@/lib/store";

export const ADMIN_COOKIE = "emo_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8;

const SECRET = process.env.ADMIN_SESSION_SECRET || "emo-store-change-this-secret";
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function createSession(username: string): string {
  const payload = `${username}.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySession(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(parts[2]);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** كلمة مرور مخزّنة ك ملح عشوائي + scrypt: scrypt$<salt>$<hash> */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPasswordHash(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hashHex] = parts;
  const expected = Buffer.from(hashHex, "hex");
  if (expected.length === 0) return false;
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** يفضّل الهاش المخزّن في Supabase، ويرجع لمتغير البيئة لو لم يُنشأ هاش بعد. */
export async function verifyCurrentPassword(password: string): Promise<boolean> {
  const stored = await getAdminPasswordHash();
  if (stored) return verifyPasswordHash(password, stored);
  return password === ADMIN_PASSWORD;
}

export async function checkCredentials(username: string, password: string): Promise<boolean> {
  if (username.trim() !== ADMIN_USERNAME) return false;
  return verifyCurrentPassword(password);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifySession(jar.get(ADMIN_COOKIE)?.value);
}
