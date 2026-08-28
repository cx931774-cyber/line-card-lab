import { database, getSessionUser, safeJson } from "../../lib/auth";
import { favoritePayload } from "./helpers";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

  const result = await database().prepare(`
    SELECT id, name, preview_image AS previewImage, created_at AS createdAt, updated_at AS updatedAt
    FROM card_favorites
    WHERE user_id = ?
    ORDER BY updated_at DESC
    LIMIT 100
  `).bind(user.id).all();
  return Response.json({ favorites: result.results }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

  const input = await safeJson(request);
  let payload: ReturnType<typeof favoritePayload>;
  try {
    payload = favoritePayload(input);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "卡片内容无效" }, { status: 400 });
  }

  const count = await database().prepare("SELECT COUNT(*) AS count FROM card_favorites WHERE user_id = ?")
    .bind(user.id).first<{ count: number }>();
  if (Number(count?.count || 0) >= 100) {
    return Response.json({ error: "每个账号最多收藏 100 个卡片" }, { status: 409 });
  }

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  await database().prepare(`
    INSERT INTO card_favorites (id, user_id, name, state_json, preview_image, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.id, payload.name, payload.stateJson, payload.previewImage || null, now, now).run();
  return Response.json({ favorite: { id, name: payload.name, previewImage: payload.previewImage, createdAt: now, updatedAt: now } }, { status: 201 });
}
