import { env } from "cloudflare:workers";
import { createSession, database, hashPassword, hasAdmin, normalizeIdentifier, safeJson, sessionCookie, sha256, validIdentifier } from "../../../lib/auth";

function setupSecret() {
  return String((env as unknown as Record<string, unknown>).ADMIN_SETUP_TOKEN || "");
}

export async function POST(request: Request) {
  if (await hasAdmin()) return Response.json({ error: "管理員已經建立" }, { status: 409 });
  const input = await safeJson(request);
  const providedToken = String(input.token || "");
  const expectedToken = setupSecret();
  if (!expectedToken || !providedToken || await sha256(providedToken) !== await sha256(expectedToken)) {
    return Response.json({ error: "初始化憑證無效" }, { status: 403 });
  }
  const identifier = normalizeIdentifier(String(input.identifier || input.email || ""));
  const displayName = String(input.displayName || "管理員").trim().slice(0, 60) || "管理員";
  const password = String(input.password || "");
  if (!validIdentifier(identifier)) return Response.json({ error: "請輸入有效的使用者名稱或電子郵件；使用者名稱需為 3–32 個字元" }, { status: 400 });
  if (password.length < 8 || password.length > 128) return Response.json({ error: "密碼需要 8–128 個字元" }, { status: 400 });

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const { hash, salt } = await hashPassword(password);
  const db = database();
  await db.prepare(`
    INSERT INTO users (id, email, display_name, password_hash, password_salt, role, plan, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'admin', 'lifetime', ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      display_name = excluded.display_name,
      password_hash = excluded.password_hash,
      password_salt = excluded.password_salt,
      role = 'admin',
      plan = 'lifetime',
      vip_expires_at = NULL,
      updated_at = excluded.updated_at
  `).bind(id, identifier, displayName, hash, salt, now, now).run();
  const admin = await db.prepare("SELECT id FROM users WHERE email = ?").bind(identifier).first<{ id: string }>();
  if (!admin) return Response.json({ error: "管理員建立失敗" }, { status: 500 });
  await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(admin.id).run();
  const token = await createSession(admin.id);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(token) } });
}
