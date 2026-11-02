import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const root = new URL("../public/live-ar/", import.meta.url);
const vendor = new URL("vendor/", root);
await mkdir(vendor, { recursive: true });
await cp(
  new URL(
    "../node_modules/@mediapipe/tasks-vision/vision_bundle.js",
    import.meta.url,
  ),
  new URL("vision_bundle.js", vendor),
);
await cp(
  new URL("../node_modules/@mediapipe/tasks-vision/wasm", import.meta.url),
  new URL("wasm/", vendor),
  { recursive: true },
);
const models = [
  [
    "face_landmarker.task",
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff",
  ],
  [
    "selfie_multiclass.tflite",
    "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite",
    "c6748b1253a99067ef71f7e26ca71096cd449baefa8f101900ea23016507e0e0",
  ],
];
await mkdir(new URL("models/", root), { recursive: true });
for (const [name, url, expected] of models) {
  const file = new URL(`models/${name}`, root);
  let bytes = await readFile(file).catch(() => null);
  if (!bytes) {
    const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok)
      throw new Error(`Could not download ${name}: ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (createHash("sha256").update(bytes).digest("hex") !== expected)
    throw new Error(`Integrity check failed for ${name}.`);
  await writeFile(file, bytes);
  console.log(
    `${name}: ${bytes.length} bytes, sha256 ${createHash("sha256").update(bytes).digest("hex")}`,
  );
}
