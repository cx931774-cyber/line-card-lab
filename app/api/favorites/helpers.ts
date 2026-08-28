type FavoriteState = {
  version?: unknown;
  settings?: unknown;
  cards?: unknown;
};

export function favoritePayload(input: Record<string, unknown>) {
  const state = input.state as FavoriteState | null;
  if (!state || typeof state !== "object" || !state.settings || typeof state.settings !== "object" || !Array.isArray(state.cards)) {
    throw new Error("卡片内容无效");
  }
  if (state.cards.length < 1 || state.cards.length > 12) {
    throw new Error("收藏必须包含 1 至 12 张卡片");
  }

  const stateJson = JSON.stringify({ ...state, version: 1 });
  if (new TextEncoder().encode(stateJson).byteLength > 200 * 1024) {
    throw new Error("卡片内容过大，无法收藏");
  }

  const firstCard = state.cards[0] as Record<string, unknown> | undefined;
  const submittedName = String(input.name || "").trim();
  const name = (submittedName || String(firstCard?.title || "").trim() || "未命名卡片").slice(0, 80);
  const previewImage = String(firstCard?.image || "").trim().slice(0, 2000);
  return { name, stateJson, previewImage };
}
