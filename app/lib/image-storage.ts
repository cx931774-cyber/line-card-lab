import { env } from "cloudflare:workers";
import { Buffer } from "node:buffer";

// Base64 expands each 256 KiB chunk to about 350 KiB, below D1's row limit.
const CHUNK_BYTES = 256 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_CHUNK_CHARACTERS = Math.ceil(CHUNK_BYTES / 3) * 4;

type ImageMetadata = {
  content_type: string;
  byte_size: number;
  chunk_count: number;
};

type ImageChunk = {
  chunk_index: number;
  data: string;
};

export function imageStorageAvailable() {
  return Boolean(env.UPLOADS || env.DB);
}

export async function storeImage(key: string, file: File, contentType: string) {
  if (env.UPLOADS) {
    await env.UPLOADS.put(key, file.stream(), {
      httpMetadata: { contentType },
    });
    return;
  }
  if (!env.DB) throw new Error("圖片儲存暫不可用");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("圖片不能超過 5MB");

  const bytes = await file.arrayBuffer();
  const chunkCount = Math.ceil(bytes.byteLength / CHUNK_BYTES);
  const statements = [
    env.DB.prepare(`
      INSERT INTO uploaded_images (key, content_type, byte_size, chunk_count, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(key, contentType, bytes.byteLength, chunkCount, Math.floor(Date.now() / 1000)),
  ];

  for (let index = 0; index < chunkCount; index += 1) {
    const offset = index * CHUNK_BYTES;
    const data = Buffer.from(bytes, offset, Math.min(CHUNK_BYTES, bytes.byteLength - offset)).toString("base64");
    statements.push(env.DB.prepare(`
      INSERT INTO uploaded_image_chunks (image_key, chunk_index, data) VALUES (?, ?, ?)
    `).bind(key, index, data));
  }

  // A single batch commits the metadata and all chunks together.
  await env.DB.batch(statements);
}

export async function readImage(key: string): Promise<{
  body: ReadableStream | ArrayBuffer;
  contentType: string;
} | null> {
  if (env.UPLOADS) {
    const object = await env.UPLOADS.get(key);
    if (object) {
      return {
        body: object.body,
        contentType: object.httpMetadata?.contentType || "image/jpeg",
      };
    }
  }
  if (!env.DB) return null;

  const metadata = await env.DB.prepare(`
    SELECT content_type, byte_size, chunk_count FROM uploaded_images WHERE key = ?
  `).bind(key).first<ImageMetadata>();
  if (!metadata) return null;
  if (!Number.isInteger(metadata.byte_size) || metadata.byte_size < 0 || metadata.byte_size > MAX_IMAGE_BYTES
    || metadata.chunk_count !== Math.ceil(metadata.byte_size / CHUNK_BYTES)) {
    throw new Error("圖片儲存資料不完整");
  }

  const { results } = await env.DB.prepare(`
    SELECT chunk_index, data FROM uploaded_image_chunks WHERE image_key = ? ORDER BY chunk_index LIMIT ?
  `).bind(key, metadata.chunk_count + 1).all<ImageChunk>();
  if (results.length !== metadata.chunk_count) throw new Error("圖片儲存資料不完整");

  const body = new Uint8Array(metadata.byte_size);
  for (let index = 0; index < results.length; index += 1) {
    const chunk = results[index];
    const offset = index * CHUNK_BYTES;
    if (chunk.chunk_index !== index || typeof chunk.data !== "string" || chunk.data.length > MAX_CHUNK_CHARACTERS) {
      throw new Error("圖片儲存資料不完整");
    }
    const data = Buffer.from(chunk.data, "base64");
    if (data.byteLength !== Math.min(CHUNK_BYTES, body.byteLength - offset)) {
      throw new Error("圖片儲存資料不完整");
    }
    body.set(data, offset);
  }

  return { body: body.buffer, contentType: metadata.content_type };
}
