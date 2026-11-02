import { expect, it } from "vitest";
import sharp from "sharp";
import { normalizeImage } from "../src/server/media";

it("normalizes an image to JPEG at the provider limit and removes metadata", async () => {
  const input = await sharp({
    create: { width: 1600, height: 2000, channels: 3, background: "#b7bda0" },
  })
    .withMetadata({ orientation: 6 })
    .png()
    .toBuffer();
  const output = await normalizeImage(input);
  const metadata = await sharp(output).metadata();
  expect(metadata.format).toBe("jpeg");
  expect(Math.max(metadata.width!, metadata.height!)).toBe(1024);
  expect(metadata.exif).toBeUndefined();
  expect(metadata.orientation).toBeUndefined();
});

it("rejects unsupported, oversized and too-small uploads", async () => {
  await expect(normalizeImage(Buffer.from("not an image"))).rejects.toThrow(
    "Choose a clear",
  );
  await expect(normalizeImage(new Uint8Array(4_000_001))).rejects.toThrow(
    "smaller than 4 MB",
  );
  const small = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  await expect(normalizeImage(small)).rejects.toThrow("at least 128 pixels");
});
