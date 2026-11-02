import "server-only";
import { get, put, del } from "@vercel/blob";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { AppError } from "./response";

const root = join(process.cwd(), ".stillyou", "media");
function remote() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  if (process.env.VERCEL || process.env.NODE_ENV === "production")
    throw new Error("A private Blob store is required in production.");
  return false;
}
function validKey(key: string) {
  if (!/^[a-zA-Z0-9_/-]+\.jpg$/.test(key) || key.includes(".."))
    throw new AppError("Invalid image.", 400);
  return key;
}

export async function normalizeImage(bytes: Uint8Array) {
  if (bytes.length > 4_000_000)
    throw new AppError("Choose an image smaller than 4 MB.", 400);
  try {
    const image = sharp(bytes, {
      limitInputPixels: 40_000_000,
      animated: false,
    });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? ""))
      throw new Error("format");
    if ((metadata.width ?? 0) < 128 || (metadata.height ?? 0) < 128)
      throw new Error("size");
    return await image
      .rotate()
      .resize({
        width: 1024,
        height: 1024,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 92 })
      .toBuffer();
  } catch {
    throw new AppError(
      "Choose a clear JPG, PNG or WebP image at least 128 pixels wide and tall.",
      400,
    );
  }
}

export async function saveImage(key: string, bytes: Uint8Array) {
  validKey(key);
  if (remote()) {
    await put(key, Buffer.from(bytes), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "image/jpeg",
    });
    return key;
  }
  const file = join(root, key);
  await mkdir(join(file, ".."), { recursive: true, mode: 0o700 });
  await writeFile(file, bytes, { mode: 0o600 });
  return key;
}

export async function readImage(key: string) {
  validKey(key);
  if (remote()) {
    const result = await get(key, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200)
      throw new AppError("Image not found.", 404);
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }
  try {
    return await readFile(join(root, key));
  } catch {
    throw new AppError("Image not found.", 404);
  }
}

export async function deleteImage(key: string) {
  validKey(key);
  if (remote()) await del(key);
  else await rm(join(root, key), { force: true });
}
