import { createSession, database, normalizeIdentifier, safeJson, sessionCookie, verifyPassword } from "../../../lib/auth";

export async function POST(request: Request) {
  const input = await safeJson(request);
  const identifier = normalizeIdentifier(String(input.identifier || input.email || ""));
  const password = String(input.password || "");
  const user = await database().prepare(`
    SELECT id, password_hash AS passwordHash, password_salt AS passwordSalt
    FROM users WHERE email = ?
  `).bind(identifier).first<{ id: string; passwordHash: string; passwordSalt: string }>();
  if (!user || !(await verifyPassword(password, user.passwordSalt, user.passwordHash))) {
    return Response.json({ error: "使用者名稱、電子郵件或密碼錯誤" }, { status: 401 });
  }
  const token = await createSession(user.id);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(token) } });
}
