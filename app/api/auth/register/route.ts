import { createSession, database, hashPassword, identifierDisplayName, normalizeIdentifier, safeJson, sessionCookie, validIdentifier } from "../../../lib/auth";

export async function POST(request: Request) {
  const input = await safeJson(request);
  const identifier = normalizeIdentifier(String(input.identifier || input.email || ""));
  const password = String(input.password || "");
  if (!validIdentifier(identifier)) return Response.json({ error: "请输入有效的用户名或邮箱；用户名需为 3–32 个字符" }, { status: 400 });
  if (password.length < 8 || password.length > 128) return Response.json({ error: "密码需要 8–128 个字符" }, { status: 400 });

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const { hash, salt } = await hashPassword(password);
  try {
    await database().prepare(`
      INSERT INTO users (id, email, display_name, password_hash, password_salt, role, plan, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'user', 'free', ?, ?)
    `).bind(id, identifier, identifierDisplayName(identifier), hash, salt, now, now).run();
  } catch {
    return Response.json({ error: "此用户名或邮箱已经注册" }, { status: 409 });
  }

  const token = await createSession(id);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(token) } });
}
