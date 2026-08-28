import { env } from "cloudflare:workers";
import { database, getSessionUser } from "../../../lib/auth";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (user?.role !== "admin") {
    return Response.json({ error: "无权上传" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "请选择 USDT 图片" }, { status: 400 });
  }

  const extension = IMAGE_TYPES[file.type];
  if (!extension) {
    return Response.json({ error: "仅支持 JPG、PNG 或 WebP 图片" }, { status: 415 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "图片不能超过 2MB" }, { status: 413 });
  }

  const bucket = env.UPLOADS;
  if (!bucket) {
    return Response.json({ error: "图片存储暂不可用" }, { status: 503 });
  }

  const key = `usdt-logo-${crypto.randomUUID()}.${extension}`;
  await bucket.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const usdtLogoUrl = `/api/images/${key}`;
  const now = Math.floor(Date.now() / 1000);
  await database().prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES ('usdt_logo_url', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).bind(usdtLogoUrl, now).run();

  return Response.json({ ok: true, usdtLogoUrl });
}
