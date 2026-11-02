import { chromium, expect } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { resolve } from "node:path";

const origin = "http://localhost:3000";
const artifactDir = resolve("artifacts/live-ar");
const recorded = resolve(
  process.argv[2] || "artifacts/gates/2026-10-20T06-16-12-060Z",
);
await mkdir(artifactDir, { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    `--use-file-for-fake-video-capture=${artifactDir}/camera.y4m`,
  ],
});
const context = await browser.newContext({
  permissions: ["camera"],
  viewport: { width: 1280, height: 960 },
});
const page = await context.newPage();
const errors = [];
const traffic = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error")
    console.log("Browser:", message.text().slice(0, 450));
});
page.on("request", (request) =>
  traffic.push({ url: request.url(), method: request.method() }),
);
async function post(path, data) {
  const response = await context.request.post(origin + path, {
    headers: { origin },
    ...data,
  });
  if (!response.ok()) throw new Error(`${path}: ${response.status()}`);
  return response.json();
}
try {
  const created = await post("/api/workspace");
  const photo = await post("/api/photos", {
    multipart: {
      consent: "true",
      takenOn: "2026-10-20",
      photo: {
        name: "source.jpg",
        mimeType: "image/jpeg",
        buffer: await readFile(
          "fixtures/private/provider-samples/female_sleek_middle_part.jpg",
        ),
      },
    },
  });
  let latest;
  for (const name of ["purple", "red"])
    latest = await post("/api/choices", {
      multipart: {
        consent: "true",
        name: `${name} wig · recorded API test`,
        kind: "hair",
        photo: {
          name: `${name}.jpg`,
          mimeType: "image/jpeg",
          buffer: await readFile(`fixtures/private/commons-wigs/${name}.jpg`),
        },
      },
    });
  const id = created.workspace.id;
  const documentPath = resolve(
    ".stillyou/documents",
    createHash("sha256").update(`workspace:${id}`).digest("hex") + ".json",
  );
  const document = JSON.parse(await readFile(documentPath, "utf8"));
  if (document.value.id !== id || document.value.previews.length)
    throw new Error("Expected a new local test workspace.");
  for (const [index, choice] of latest.workspace.choices.entries()) {
    const previewId = randomUUID();
    const resultKey = `${id}/${previewId}.jpg`;
    await copyFile(
      `${recorded}/wig-${index + 1}.jpg`,
      resolve(".stillyou/media", resultKey),
    );
    document.value.previews.push({
      id: previewId,
      kind: "hair",
      choiceId: choice.id,
      sourceId: photo.workspace.photos[0].id,
      sourceDate: "2026-10-20",
      createdAt: new Date().toISOString(),
      state: "success",
      resultKey,
    });
  }
  document.version++;
  await writeFile(documentPath, JSON.stringify(document), { mode: 0o600 });
  await page.goto(origin + "/studio");
  await page
    .getByRole("button", { name: "Try this wig live", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("Your camera is off", { exact: true }),
  ).toBeVisible();
  traffic.length = 0;
  await page
    .getByRole("button", { name: "Start live preview", exact: true })
    .click();
  await Promise.race([
    expect(page.getByRole("status")).toContainText("Tracking your face", {
      timeout: 60000,
    }),
    page
      .locator(".live-try-on [role=alert]")
      .waitFor({ state: "visible", timeout: 65000 })
      .then(async () => {
        throw new Error(
          await page.locator(".live-try-on [role=alert]").innerText(),
        );
      }),
  ]);
  const centers = [];
  for (let sample = 0; sample < 5; sample++) {
    const center = await page.evaluate(() => {
      const c = document.querySelector(".live-canvas");
      const pixels = c
        .getContext("2d")
        .getImageData(0, 0, c.width, c.height).data;
      let total = 0,
        count = 0;
      for (let i = 0; i < pixels.length; i += 4)
        if (pixels[i] > 150 && pixels[i + 1] < 65 && pixels[i + 2] < 65) {
          total += (i / 4) % c.width;
          count++;
        }
      return count > 100 ? total / count : null;
    });
    if (center !== null) centers.push(center);
    await page.waitForTimeout(200);
  }
  if (centers.length < 3 || Math.max(...centers) - Math.min(...centers) < 8)
    throw new Error("Wig overlay did not follow the moving camera fixture.");
  await expect(page.getByRole("status")).toContainText("No face in view", {
    timeout: 20000,
  });
  await expect(page.getByRole("status")).toContainText("Tracking your face", {
    timeout: 10000,
  });
  const tracks = await page.evaluate(() => {
    window.testTracks = document
      .querySelector(".live-input")
      .srcObject.getTracks();
    return window.testTracks.length;
  });
  if (tracks !== 1) throw new Error("Unexpected camera tracks");
  await page.screenshot({ path: artifactDir + "/live-overlay-desktop.png" });
  await page.getByRole("button", { name: "See original", exact: true }).click();
  await expect(
    page.getByText("Your original camera view", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: artifactDir + "/original-desktop.png" });
  await page.getByRole("button", { name: "Show wig", exact: true }).click();
  await page.getByText("Adjust overlay alignment", { exact: true }).click();
  await page.getByRole("slider", { name: /Overlay size/ }).fill("1.1");
  await page
    .getByRole("button", { name: "Reset alignment", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: artifactDir + "/live-overlay-mobile.png",
    fullPage: true,
  });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw new Error("Mobile overflow");
  await page
    .getByLabel("Wig preview", { exact: true })
    .selectOption({ index: 0 });
  if (
    !(await page.evaluate(() =>
      window.testTracks.every((track) => track.readyState === "ended"),
    ))
  )
    throw new Error("Switch left camera active");
  await page
    .getByRole("button", { name: "Start live preview", exact: true })
    .click();
  await Promise.race([
    expect(page.getByRole("status")).toContainText("Tracking your face", {
      timeout: 60000,
    }),
    page
      .locator(".live-try-on [role=alert]")
      .waitFor({ state: "visible", timeout: 65000 })
      .then(async () => {
        throw new Error(
          await page.locator(".live-try-on [role=alert]").innerText(),
        );
      }),
  ]);
  await page.evaluate(() => {
    window.testTracks = document
      .querySelector(".live-input")
      .srcObject.getTracks();
  });
  await page.screenshot({ path: artifactDir + "/second-style-mobile.png" });
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  if (
    !(await page.evaluate(() =>
      window.testTracks.every((track) => track.readyState === "ended"),
    ))
  )
    throw new Error("Close left camera active");
  const prohibited = traffic.filter(
    (request) => request.method !== "GET" || !request.url.startsWith(origin),
  );
  if (prohibited.length)
    throw new Error(
      "Unexpected live-mode network traffic: " +
        JSON.stringify(
          prohibited.map((request) => ({
            method: request.method,
            path: new URL(request.url).pathname,
          })),
        ),
    );
  if (errors.length) throw new Error(errors.join("\n"));
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Test denial", "NotAllowedError");
    };
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Try this wig live", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Start live preview", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Camera access was not allowed" }),
  ).toBeVisible();
  await writeFile(
    artifactDir + "/check.json",
    JSON.stringify(
      {
        status: "passed",
        recordedYouCamResults: true,
        newProviderCalls: 0,
        camera: "simulated device with provider demonstration face",
        checks: [
          "real local segmentation and face tracking",
          "overlay follows moving fixture",
          "face loss and recovery",
          "camera denial fallback",
          "original toggle",
          "alignment controls",
          "mobile layout",
          "style switch stops camera",
          "close stops camera",
          "no frame upload or external request",
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: live segmentation/tracking, controls, mobile layout, style switch, camera cleanup and no frame upload. Recorded API fixtures; simulated camera.",
  );
} catch (error) {
  await page.screenshot({ path: artifactDir + "/failure.png", fullPage: true });
  console.error(error);
  process.exitCode = 1;
} finally {
  await context.request
    .delete(origin + "/api/workspace", { headers: { origin } })
    .catch(() => {});
  await browser.close();
}
