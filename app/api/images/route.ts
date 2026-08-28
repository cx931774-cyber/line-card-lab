import { env } from "cloudflare:workers";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "请选择图片文件" }, { status: 400 });
  }
  if (file.type !== "image/jpeg") {
    return Response.json({ error: "图片格式不受支持" }, { status: 415 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "处理后的图片不能超过 5MB" }, { status: 413 });
  }

  const bucket = env.UPLOADS;
  if (!bucket) {
    return Response.json({ error: "图片存储暂不可用" }, { status: 503 });
  }

  const key = `${crypto.randomUUID()}.jpg`;
  await bucket.put(key, file.stream(), {
    httpMetadata: { contentType: "image/jpeg" },
  });

  return Response.json({
    url: new URL(`/api/images/${key}`, request.url).toString(),
  });
}
