import { database, getSessionUser, paymentDetails, safeJson, type Plan } from "../../lib/auth";

async function requireAdmin(request: Request) {
  const user = await getSessionUser(request);
  return user?.role === "admin" ? user : null;
}

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) return Response.json({ error: "無權存取" }, { status: 403 });
  const db = database();
  const [result, payments, generations, payment] = await Promise.all([
    db.prepare(`
      SELECT id, email AS identifier, display_name AS displayName, role, plan,
             vip_expires_at AS vipExpiresAt, created_at AS createdAt,
             COALESCE((
               SELECT COUNT(*) FROM generation_events g
               WHERE g.user_id = users.id AND g.access_type = 'free' AND g.status = 'allowed'
             ), 0) AS freeGenerationsUsed,
             (SELECT MAX(g.created_at) FROM generation_events g WHERE g.user_id = users.id) AS lastGenerationAt
      FROM users ORDER BY created_at DESC LIMIT 500
    `).all(),
    db.prepare(`
      SELECT p.id, p.user_id AS userId, p.plan, p.amount_cents AS amountCents,
             p.transaction_hash AS transactionHash, p.status, p.created_at AS createdAt,
             u.email AS identifier, u.display_name AS displayName
      FROM payment_submissions p
      JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC LIMIT 500
    `).all(),
    db.prepare(`
      SELECT g.id, g.user_id AS userId, g.template, g.access_type AS accessType,
             g.status, g.plan, g.created_at AS createdAt,
             u.email AS identifier, u.display_name AS displayName
      FROM generation_events g
      JOIN users u ON u.id = g.user_id
      ORDER BY g.created_at DESC LIMIT 500
    `).all(),
    paymentDetails(),
  ]);
  return Response.json({ users: result.results, payments: payments.results, generations: generations.results, ...payment });
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin(request))) return Response.json({ error: "無權存取" }, { status: 403 });
  const input = await safeJson(request);
  const now = Math.floor(Date.now() / 1000);

  if (input.usdtAddress !== undefined || input.usdtNetwork !== undefined) {
    const usdtAddress = String(input.usdtAddress || "").trim();
    const usdtNetwork = String(input.usdtNetwork || "").trim();
    if (!usdtAddress) return Response.json({ error: "請輸入 USDT 收款地址" }, { status: 400 });
    if (!usdtNetwork) return Response.json({ error: "請輸入 USDT 鏈網路" }, { status: 400 });
    if (usdtAddress.length > 200 || usdtNetwork.length > 40) {
      return Response.json({ error: "充值資訊長度超出限制" }, { status: 400 });
    }
    const db = database();
    await db.batch([
      db.prepare(`
        INSERT INTO settings (key, value, updated_at) VALUES ('usdt_address', ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).bind(usdtAddress, now),
      db.prepare(`
        INSERT INTO settings (key, value, updated_at) VALUES ('usdt_network', ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).bind(usdtNetwork, now),
    ]);
    return Response.json({ ok: true, usdtAddress, usdtNetwork });
  }

  const userId = String(input.userId || "");
  const plan = String(input.plan || "") as Plan;
  if (!userId || !["free", "monthly", "annual", "lifetime"].includes(plan)) {
    return Response.json({ error: "使用者或套餐無效" }, { status: 400 });
  }
  const expiresAt = plan === "monthly" ? now + 30 * 86400 : plan === "annual" ? now + 365 * 86400 : null;
  await database().prepare("UPDATE users SET plan = ?, vip_expires_at = ?, updated_at = ? WHERE id = ? AND role != 'admin'")
    .bind(plan, expiresAt, now, userId).run();
  return Response.json({ ok: true, vipExpiresAt: expiresAt });
}
