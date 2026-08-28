import { activationUrl, database, getSessionUser, safeJson, type Plan } from "../../lib/auth";

async function requireAdmin(request: Request) {
  const user = await getSessionUser(request);
  return user?.role === "admin" ? user : null;
}

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) return Response.json({ error: "无权访问" }, { status: 403 });
  const result = await database().prepare(`
    SELECT id, email, display_name AS displayName, role, plan,
           vip_expires_at AS vipExpiresAt, created_at AS createdAt
    FROM users ORDER BY created_at DESC LIMIT 500
  `).all();
  return Response.json({ users: result.results, activationUrl: await activationUrl() });
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin(request))) return Response.json({ error: "无权访问" }, { status: 403 });
  const input = await safeJson(request);
  const now = Math.floor(Date.now() / 1000);

  if (input.activationUrl !== undefined) {
    const value = String(input.activationUrl || "").trim();
    let url: URL;
    try { url = new URL(value); } catch { return Response.json({ error: "请输入有效的开通地址" }, { status: 400 }); }
    if (!/^https?:$/.test(url.protocol)) return Response.json({ error: "开通地址需要使用 HTTP 或 HTTPS" }, { status: 400 });
    await database().prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES ('activation_url', ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).bind(url.href, now).run();
    return Response.json({ ok: true, activationUrl: url.href });
  }

  const userId = String(input.userId || "");
  const plan = String(input.plan || "") as Plan;
  if (!userId || !["free", "monthly", "annual", "lifetime"].includes(plan)) {
    return Response.json({ error: "用户或套餐无效" }, { status: 400 });
  }
  const expiresAt = plan === "monthly" ? now + 30 * 86400 : plan === "annual" ? now + 365 * 86400 : null;
  await database().prepare("UPDATE users SET plan = ?, vip_expires_at = ?, updated_at = ? WHERE id = ? AND role != 'admin'")
    .bind(plan, expiresAt, now, userId).run();
  return Response.json({ ok: true, vipExpiresAt: expiresAt });
}
