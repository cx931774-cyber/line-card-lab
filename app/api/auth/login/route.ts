import { createSession, database, normalizeEmail, safeJson, sessionCookie, verifyPassword } from "../../../lib/auth";

export async function POST(request: Request) {
  const input = await safeJson(request);
  const email = normalizeEmail(String(input.email || ""));
  const password = String(input.password || "");
  const user = await database().prepare(`
    SELECT id, password_hash AS passwordHash, password_salt AS passwordSalt
    FROM users WHERE email = ?
  `).bind(email).first<{ id: string; passwordHash: string; passwordSalt: string }>();
  if (!user || !(await verifyPassword(password, user.passwordSalt, user.passwordHash))) {
    return Response.json({ error: "邮箱或密码错误" }, { status: 401 });
  }
  const token = await createSession(user.id);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(token) } });
}
