import { env } from "cloudflare:workers";
import { createSession, database, hashPassword, hasAdmin, normalizeEmail, safeJson, sessionCookie, sha256, validEmail } from "../../../lib/auth";

function setupSecret() {
  return String((env as unknown as Record<string, unknown>).ADMIN_SETUP_TOKEN || "");
}

export async function POST(request: Request) {
  if (await hasAdmin()) return Response.json({ error: "管理员已经建立" }, { status: 409 });
  const input = await safeJson(request);
  const providedToken = String(input.token || "");
  const expectedToken = setupSecret();
  if (!expectedToken || !providedToken || await sha256(providedToken) !== await sha256(expectedToken)) {
    return Response.json({ error: "初始化凭证无效" }, { status: 403 });
  }
  const email = normalizeEmail(String(input.email || ""));
  const displayName = String(input.displayName || "管理员").trim().slice(0, 60) || "管理员";
  const password = String(input.password || "");
  if (!validEmail(email)) return Response.json({ error: "请输入有效邮箱" }, { status: 400 });
  if (password.length < 8 || password.length > 128) return Response.json({ error: "密码需要 8–128 个字符" }, { status: 400 });

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const { hash, salt } = await hashPassword(password);
  await database().prepare(`
    INSERT INTO users (id, email, display_name, password_hash, password_salt, role, plan, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'admin', 'lifetime', ?, ?)
  `).bind(id, email, displayName, hash, salt, now, now).run();
  const token = await createSession(id);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(token) } });
}
