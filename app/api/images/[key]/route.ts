import { readImage } from "../../../lib/image-storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params;
  if (!/^(?:usdt-logo-)?[0-9a-f-]{36}\.(?:jpg|png|webp)$/i.test(key)) {
    return new Response("Not found", { status: 404 });
  }

  const object = await readImage(key);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": object.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
