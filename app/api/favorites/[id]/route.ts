import { database, getSessionUser, safeJson } from "../../../lib/auth";
import { favoritePayload } from "../helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  const { id } = await context.params;
  const row = await database().prepare(`
    SELECT id, name, state_json AS stateJson, preview_image AS previewImage,
           created_at AS createdAt, updated_at AS updatedAt
    FROM card_favorites WHERE id = ? AND user_id = ?
  `).bind(id, user.id).first<{ id: string; name: string; stateJson: string; previewImage: string | null; createdAt: number; updatedAt: number }>();
  if (!row) return Response.json({ error: "收藏不存在" }, { status: 404 });
  return Response.json({ favorite: { ...row, state: JSON.parse(row.stateJson), stateJson: undefined } }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  const { id } = await context.params;
  const input = await safeJson(request);
  let payload: ReturnType<typeof favoritePayload>;
  try {
    payload = favoritePayload(input);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "卡片内容无效" }, { status: 400 });
  }

  const now = Math.floor(Date.now() / 1000);
  const result = await database().prepare(`
    UPDATE card_favorites
    SET name = ?, state_json = ?, preview_image = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).bind(payload.name, payload.stateJson, payload.previewImage || null, now, id, user.id).run();
  if (!result.meta.changes) return Response.json({ error: "收藏不存在" }, { status: 404 });
  return Response.json({ favorite: { id, name: payload.name, previewImage: payload.previewImage, updatedAt: now } });
}

export async function DELETE(request: Request, context: RouteContext) {
  const user = await getSessionUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  const { id } = await context.params;
  const result = await database().prepare("DELETE FROM card_favorites WHERE id = ? AND user_id = ?")
    .bind(id, user.id).run();
  if (!result.meta.changes) return Response.json({ error: "收藏不存在" }, { status: 404 });
  return Response.json({ ok: true });
}
