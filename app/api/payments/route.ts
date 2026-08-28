import { database, getSessionUser, safeJson } from "../../lib/auth";

const PLAN_PRICES = { monthly: 1990, annual: 8900, lifetime: 29900 } as const;

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

  const input = await safeJson(request);
  const plan = String(input.plan || "") as keyof typeof PLAN_PRICES;
  const transactionHash = String(input.transactionHash || "").trim();
  if (!(plan in PLAN_PRICES)) return Response.json({ error: "充值套餐无效" }, { status: 400 });
  if (transactionHash.length < 8 || transactionHash.length > 200 || /\s/.test(transactionHash)) {
    return Response.json({ error: "请输入有效的交易哈希值" }, { status: 400 });
  }

  try {
    await database().prepare(`
      INSERT INTO payment_submissions
        (id, user_id, plan, amount_cents, transaction_hash, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).bind(
      crypto.randomUUID(),
      user.id,
      plan,
      PLAN_PRICES[plan],
      transactionHash,
      Math.floor(Date.now() / 1000),
    ).run();
  } catch {
    return Response.json({ error: "此交易哈希已经提交" }, { status: 409 });
  }

  return Response.json({ ok: true });
}
