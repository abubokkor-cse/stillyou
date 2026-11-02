import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { YouCamClient, YouCamError, buildTaskBody } from "../src/lib/youcam";
import type { PreviewKind } from "../src/lib/types";

const manifestSchema = z.object({
  consentConfirmed: z.literal(true),
  hairOnly: z.boolean().default(false),
  referenceType: z
    .enum(["actual_wig", "provider_style_sample"])
    .default("actual_wig"),
  source: z.string(),
  shortHairSource: z.string(),
  wigReferences: z.array(z.string()).min(5),
  hatReference: z.string(),
  hatGender: z.enum(["female", "male"]),
});

async function main() {
  if (!process.env.YOUCAM_API_KEY)
    throw new Error(
      "Set YOUCAM_API_KEY in .env.local. No requests have been sent.",
    );
  const manifest = manifestSchema.parse(
    JSON.parse(
      await readFile(process.argv[2] ?? "fixtures/private/gates.json", "utf8"),
    ),
  );
  const allFiles = [
    manifest.source,
    manifest.shortHairSource,
    ...manifest.wigReferences,
    manifest.hatReference,
  ];
  const images = new Map<string, Buffer>();
  for (const file of allFiles)
    images.set(
      file,
      await sharp(await readFile(resolve(file)), {
        limitInputPixels: 40_000_000,
      })
        .rotate()
        .resize({
          width: 1024,
          height: 1024,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 92 })
        .toBuffer(),
    );
  const client = new YouCamClient(process.env.YOUCAM_API_KEY);
  const dir = resolve(
    "artifacts/gates",
    new Date().toISOString().replace(/[:.]/g, "-"),
  );
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const uploads = new Map<string, string>();
  async function upload(file: string) {
    if (!uploads.has(file))
      uploads.set(
        file,
        await client.upload(images.get(file)!, "gate-reference.jpg"),
      );
    return uploads.get(file)!;
  }
  const cases: {
    name: string;
    kind: PreviewKind;
    source: string;
    reference?: string;
  }[] = [
    ...manifest.wigReferences.map((reference, index) => ({
      name: `${manifest.referenceType === "actual_wig" ? "wig" : "style"}-${index + 1}`,
      kind: "hair" as const,
      source: manifest.source,
      reference,
    })),
    { name: "hair-color", kind: "color", source: manifest.source },
    { name: "brows", kind: "brows", source: manifest.source },
    {
      name: "hat",
      kind: "hat",
      source: manifest.source,
      reference: manifest.hatReference,
    },
    {
      name: "short-hair",
      kind: "hair",
      source: manifest.shortHairSource,
      reference: manifest.wigReferences[0],
    },
  ];
  for (const item of cases.filter(
    (item) => !manifest.hairOnly || item.kind === "hair",
  )) {
    const record: Record<string, unknown> = {
      ...item,
      referenceType: manifest.referenceType,
      startedAt: new Date().toISOString(),
      visualReview: "pending",
      unitsConsumed: "check account usage",
    };
    try {
      const source = await upload(item.source);
      const reference = item.reference
        ? await upload(item.reference)
        : undefined;
      const task = await client.start(
        item.kind,
        buildTaskBody(item.kind, source, {
          referenceId: reference,
          hatGender: manifest.hatGender,
        }),
      );
      record.taskId = task;
      const deadline = Date.now() + 180_000;
      let completed = false;
      while (Date.now() < deadline) {
        const result = await client.poll(item.kind, task);
        if (result.state === "running") {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          continue;
        }
        record.result = result;
        if (result.state === "success" && result.url) {
          await writeFile(
            `${dir}/${item.name}.jpg`,
            await client.download(result.url),
            { mode: 0o600 },
          );
          record.output = `${item.name}.jpg`;
        }
        completed = true;
        break;
      }
      if (!completed)
        record.result = {
          state: "pending",
          reason: "polling deadline reached; task may still finish",
        };
    } catch (error) {
      record.result = {
        state: "error",
        error:
          error instanceof YouCamError ? error.code : "local_or_schema_error",
      };
    }
    await writeFile(
      `${dir}/${item.name}.json`,
      JSON.stringify(record, null, 2),
      { mode: 0o600 },
    );
    const result = record.result as { state: string; error?: string };
    console.log(
      `${item.name}: ${result.state}${result.error ? ` (${result.error})` : ""}. Saved; visual review required.`,
    );
  }
  console.log(
    `Results: ${dir}\nReview identity, wig silhouette, reference colour and visible artifacts for every wig. Record actual short-hair behavior; do not assume failure.`,
  );
}

main().catch((error) => {
  console.error(
    error instanceof z.ZodError
      ? "Check the manifest, consent confirmation and required five references."
      : error.message,
  );
  process.exitCode = 1;
});
