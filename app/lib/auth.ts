import { env } from "cloudflare:workers";

export type Plan = "free" | "monthly" | "annual" | "lifetime";

export type SessionUser = {
  id: string;
  identifier: string;
  displayName: string;
  role: "user" | "admin";
  plan: Plan;
  vipExpiresAt: number | null;
  vip: boolean;
};

const SESSION_COOKIE = "line_card_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 100_000;

export function database() {
  if (!env.DB) throw new Error("数据库暂时不可用");
  return env.DB;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function randomToken(size = 32) {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(size)));
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function hashPassword(password: string, salt = randomToken(16)) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: base64UrlToBytes(salt), iterations: PASSWORD_ITERATIONS },
    key,
    256,
  );
  return { salt, hash: bytesToBase64Url(new Uint8Array(bits)) };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const { hash } = await hashPassword(password, salt);
  if (hash.length !== expectedHash.length) return false;
  let difference = 0;
  for (let index = 0; index < hash.length; index += 1) difference |= hash.charCodeAt(index) ^ expectedHash.charCodeAt(index);
  return difference === 0;
}

export function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

export function validIdentifier(value: string) {
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 160;
  const validUsername = /^[\p{L}\p{N}][\p{L}\p{N}._-]{2,31}$/u.test(value);
  return validEmail || validUsername;
}

export function identifierDisplayName(value: string) {
  return value.includes("@") ? value.split("@")[0] : value;
}

function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie") || "";
  for (const item of cookies.split(";")) {
    const [key, ...parts] = item.trim().split("=");
    if (key === name) return decodeURIComponent(parts.join("="));
  }
  return "";
}

export function sessionCookie(token: string, maxAge = SESSION_SECONDS) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function createSession(userId: string) {
  const token = randomToken();
  const tokenHash = await sha256(token);
  const now = Math.floor(Date.now() / 1000);
  await database().prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
  ).bind(tokenHash, userId, now + SESSION_SECONDS, now).run();
  return token;
}

export async function deleteSession(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return;
  await database().prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const now = Math.floor(Date.now() / 1000);
  const row = await database().prepare(`
    SELECT u.id, u.email AS identifier, u.display_name AS displayName, u.role, u.plan,
           u.vip_expires_at AS vipExpiresAt
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).bind(await sha256(token), now).first<Omit<SessionUser, "vip">>();
  if (!row) return null;
  const vip = row.role === "admin" || row.plan === "lifetime" || (row.plan !== "free" && Boolean(row.vipExpiresAt && row.vipExpiresAt > now));
  return { ...row, role: row.role === "admin" ? "admin" : "user", plan: row.plan as Plan, vip };
}

export async function paymentDetails() {
  const result = await database().prepare(
    "SELECT key, value FROM settings WHERE key IN ('usdt_address', 'usdt_network', 'usdt_logo_url')",
  ).all<{ key: string; value: string }>();
  const values = new Map(result.results.map((row) => [row.key, row.value]));
  return {
    usdtAddress: values.get("usdt_address") || "",
    usdtNetwork: values.get("usdt_network") || "",
    usdtLogoUrl: values.get("usdt_logo_url") || "",
  };
}

export async function hasAdmin() {
  const row = await database().prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").first<{ count: number }>();
  return Number(row?.count || 0) > 0;
}

export async function safeJson(request: Request) {
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    return {};
  }
}
