import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

async function main() {
  const catalog = JSON.parse(
    await readFile("fixtures/hair-templates.json", "utf8"),
  );
  const root = "fixtures/private/provider-samples";
  await mkdir(root, { recursive: true, mode: 0o700 });
  const names = [
    "female_sleek_middle_part",
    "female_buzz_cut",
    "female_blunt_bob",
    "female_s_wave_brunette",
    "female_retro_brown_waves",
    "female_dark_tone_fringe_bob",
    "female_soft_red_ombre_waves",
  ];
  const sources: Record<string, string> = {};
  for (const name of names) {
    const template = catalog.data.templates.find(
      (item: { id: string }) => item.id === name,
    );
    if (!template) throw new Error(`Template missing: ${name}`);
    sources[name] = template.thumb;
  }
  sources["hat-doc-0"] =
    "https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/026_thumb_dca334af3c.jpg";
  for (const [name, url] of Object.entries(sources)) {
    const response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
    if (!response.ok)
      throw new Error(`Could not download ${name}: HTTP ${response.status}`);
    const image = await sharp(Buffer.from(await response.arrayBuffer()))
      .rotate()
      .resize({
        width: 1024,
        height: 1024,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 92 })
      .toBuffer();
    await writeFile(`${root}/${name}.jpg`, image, { mode: 0o600 });
    console.log(`Saved ${name}`);
  }
  await writeFile(
    `${root}/sources.json`,
    JSON.stringify(
      {
        purpose:
          "Provider API template thumbnails and documented Hat API input, for local integration testing. These are not verified wig product references, patient photos, or a real treatment timeline. Do not redistribute these test assets as the application's commercial catalogue.",
        sources,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  await writeFile(
    "fixtures/private/gates.json",
    JSON.stringify(
      {
        consentConfirmed: true,
        referenceType: "provider_style_sample",
        source: `${root}/female_sleek_middle_part.jpg`,
        shortHairSource: `${root}/female_buzz_cut.jpg`,
        wigReferences: names.slice(2).map((name) => `${root}/${name}.jpg`),
        hatReference: `${root}/hat-doc-0.jpg`,
        hatGender: "female",
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(
    "Provider samples are ready. This does not establish actual wig fidelity. No generation requests were made.",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
