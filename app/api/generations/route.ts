import { database, getSessionUser, safeJson } from "../../lib/auth";

const FREE_GENERATION_LIMIT = 3;

function validTemplate(value: string) {
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
}

function changedRows(result: D1Result) {
  return Number(result.meta?.changes || 0);
}

export async function POST(request: Request) {
  const account = await getSessionUser(request);
  if (!account) return Response.json({ error: "請先登入" }, { status: 401 });

  const input = await safeJson(request);
  const template = String(input.template || "").trim();
  if (!validTemplate(template)) return Response.json({ error: "樣板無效" }, { status: 400 });

  const db = database();
  const now = Math.floor(Date.now() / 1000);
  const eventId = crypto.randomUUID();

  if (account.vip) {
    await db.prepare(`
      INSERT INTO generation_events (id, user_id, template, access_type, status, plan, created_at)
      VALUES (?, ?, ?, 'vip', 'allowed', ?, ?)
    `).bind(eventId, account.id, template, account.plan, now).run();
    return Response.json({ ok: true, unlimited: true, remaining: null });
  }

  const allowed = await db.prepare(`
    INSERT INTO generation_events (id, user_id, template, access_type, status, plan, created_at)
    SELECT ?, ?, ?, 'free', 'allowed', ?, ?
    WHERE (
      SELECT COUNT(*) FROM generation_events
      WHERE user_id = ? AND access_type = 'free' AND status = 'allowed'
    ) < ?
  `).bind(eventId, account.id, template, account.plan, now, account.id, FREE_GENERATION_LIMIT).run();

  if (changedRows(allowed) === 0) {
    await db.prepare(`
      INSERT INTO generation_events (id, user_id, template, access_type, status, plan, created_at)
      VALUES (?, ?, ?, 'free', 'denied', ?, ?)
    `).bind(crypto.randomUUID(), account.id, template, account.plan, now).run();
    return Response.json(
      { error: "3 次免費生成額度已用完，請開通 VIP", remaining: 0 },
      { status: 403 },
    );
  }

  const usage = await db.prepare(`
    SELECT COUNT(*) AS count FROM generation_events
    WHERE user_id = ? AND access_type = 'free' AND status = 'allowed'
  `).bind(account.id).first<{ count: number }>();
  const used = Number(usage?.count || 0);
  return Response.json({ ok: true, unlimited: false, used, remaining: Math.max(0, FREE_GENERATION_LIMIT - used) });
}
