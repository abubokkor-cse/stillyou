import { chromium, expect } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
const root = process.cwd();
if (!process.argv.includes("--live"))
  throw new Error(
    "This check uses real API units. Run with --live after preparing the documented provider samples.",
  );
await mkdir(root + "/artifacts/screenshots", { recursive: true });
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1040 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto("http://localhost:3000/studio");
  await page
    .getByRole("button", { name: "Add your reference photo", exact: true })
    .click();
  await page
    .getByLabel("Choose photo file")
    .setInputFiles(
      root + "/fixtures/private/provider-samples/female_sleek_middle_part.jpg",
    );
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Save my reference photo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Find a little familiar." }),
  ).toBeVisible();
  console.log("PASS: baseline upload and consent");
  await page
    .getByRole("button", { name: "Add wig reference", exact: true })
    .click();
  await page
    .getByLabel("Choose photo file")
    .setInputFiles(
      root + "/fixtures/private/provider-samples/female_blunt_bob.jpg",
    );
  await page.getByLabel("Name this choice").fill("Provider sample bob (test)");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Add this reference", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Preview on my photo", exact: true })
    .click();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Create my preview", exact: true })
    .click();
  await expect(page.locator(".result-image").first()).toBeVisible({
    timeout: 120000,
  });
  console.log("PASS: real API preview through frontend and server");
  await page
    .getByRole("button", {
      name: "Compare Provider sample bob (test) with original",
      exact: true,
    })
    .click();
  await page.screenshot({
    path: root + "/artifacts/screenshots/live-comparison-desktop.png",
  });
  await page
    .getByLabel("Does your face still look like you?")
    .selectOption("consistent");
  await page
    .getByLabel("Does the wig reference carry through?")
    .selectOption("useful");
  await page
    .getByLabel("What I like")
    .fill("UI test observation: familiar length.");
  await page
    .getByLabel("What gives me pause")
    .fill("UI test reservation: confirm a real shade swatch.");
  await page
    .getByRole("button", { name: "Save my review", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Review saved");
  await page
    .getByRole("button", { name: "Keep in my shortlist", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove from shortlist", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: /Compare & choose/ }).click();
  await expect(page.locator(".decision-option")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: /Compare & choose/ }).click();
  await expect(page.locator(".decision-option")).toHaveCount(1);
  console.log("PASS: shortlist persists across reload");
  await page
    .getByRole("button", { name: "Set priorities", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Within my budget", exact: true })
    .click();
  await page.getByLabel("Item budget (optional)").fill("250");
  await page
    .getByRole("button", { name: "Save my priorities", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Product facts & policy", exact: true })
    .click();
  await page
    .getByLabel("Exact product / variant link")
    .fill("https://example.com/test-wig");
  await page.getByLabel("Current item price").fill("275");
  await page.getByLabel("Selected shade").fill("Example brown (test fixture)");
  await page.getByLabel("Cap size", { exact: true }).fill("Average");
  await page.getByLabel("Fibre / construction").fill("Synthetic (example)");
  await page
    .getByLabel("Returns for this exact variant")
    .selectOption("conditional");
  await page
    .getByLabel("Return conditions")
    .fill(
      "Example policy for software testing only: unused, tags attached, 30 days.",
    );
  await page
    .getByLabel("Return-policy source")
    .fill("https://example.com/test-policy");
  await page
    .getByRole("button", { name: "Save product facts", exact: true })
    .click();
  await expect(page.locator(".comparison-facts")).toContainText("$275.00");
  await page.locator(".decision-questions summary").click();
  await expect(page.locator(".decision-questions")).toContainText(
    "above your $250.00 budget",
  );
  await page
    .getByRole("button", { name: "Make this my current pick", exact: true })
    .click();
  await page
    .getByLabel("Why is this your current pick?")
    .fill(
      "UI test decision: I can stretch the budget for this length, pending a fitting and current return eligibility.",
    );
  await page
    .getByRole("button", { name: "Save my decision", exact: true })
    .click();
  await expect(page.locator(".decision-summary")).toContainText(
    "I can stretch the budget",
  );
  await page.reload();
  await page.getByRole("button", { name: /Compare & choose/ }).click();
  await expect(page.locator(".decision-summary")).toContainText(
    "I can stretch the budget",
  );
  await page.screenshot({
    path: root + "/artifacts/screenshots/decision-board-desktop.png",
    fullPage: true,
  });
  console.log(
    "PASS: preview review, sourced example facts, budget warning and persisted decision",
  );
  await page
    .getByRole("button", { name: "Before you buy", exact: true })
    .click();
  await expect(
    page.getByText("Your saved policy notes", { exact: true }),
  ).toBeVisible();
  await page.getByText("Take your cap measurements", { exact: true }).click();
  await page.screenshot({
    path: root + "/artifacts/screenshots/purchase-card.png",
  });
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("button", { name: "Invite an opinion", exact: true })
    .first()
    .click();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Create family link", exact: true })
    .click();
  const link = await page.getByLabel("Your family link").inputValue();
  const sharedContext = await browser.newContext();
  const shared = await sharedContext.newPage();
  await shared.goto(link);
  await shared
    .getByRole("button", { name: "I like this one", exact: true })
    .click();
  await expect(
    shared.getByRole("button", { name: "Your choice", exact: true }),
  ).toBeVisible();
  const token = link.split("/").at(-1);
  const privateWorkspace = await (
    await context.request.get("http://localhost:3000/api/workspace")
  ).json();
  const privateId = privateWorkspace.workspace.photos[0].id;
  const denied = await sharedContext.request.get(
    `http://localhost:3000/api/share/${token}/media/${privateId}`,
  );
  if (denied.status() !== 404)
    throw new Error("Source photo was not protected");
  const crossOwner = await sharedContext.request.get(
    `http://localhost:3000/api/media/${privateId}`,
  );
  if (crossOwner.status() !== 401)
    throw new Error("Owner media was not protected");
  const rejected = await context.request.patch(
    "http://localhost:3000/api/workspace",
    {
      headers: { origin: "https://untrusted.example" },
      data: { action: "shortlist", previewId: "not-owned" },
    },
  );
  const decisionDenied = await sharedContext.request.patch(
    "http://localhost:3000/api/decision",
    {
      headers: { origin: "http://localhost:3000" },
      data: { action: "clear_decision" },
    },
  );
  if (decisionDenied.status() !== 401)
    throw new Error("Decision endpoint allows unauthenticated editing");
  if (rejected.status() !== 403)
    throw new Error("Cross-origin edit was not rejected");
  console.log(
    "PASS: sharing, voting, source-photo isolation and origin protection",
  );
  await page
    .getByRole("button", { name: "Revoke this link", exact: true })
    .click();
  await shared.reload();
  await expect(
    shared.getByText("This shortlist is no longer shared.", { exact: true }),
  ).toBeVisible();
  console.log("PASS: revocation blocks shared content");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: root + "/artifacts/screenshots/shortlist-mobile.png",
    fullPage: true,
  });
  if (
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
  )
    throw new Error("Mobile page overflows");
  await page
    .getByRole("button", { name: "Your privacy & photos", exact: true })
    .click();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Delete my workspace", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Add your reference photo", exact: true }),
  ).toBeVisible();
  const after = await context.request.get(
    `http://localhost:3000/api/media/${privateId}`,
  );
  if (after.status() !== 401)
    throw new Error("Deleted session still grants access");
  console.log("PASS: deletion and mobile layout");
  if (errors.length) throw new Error(errors.join("\n"));
  await writeFile(
    root + "/artifacts/browser-check.json",
    JSON.stringify(
      {
        status: "passed",
        liveApi: true,
        source: "provider demo samples; not real wig products or patient data",
        checks: [
          "baseline upload",
          "reference upload",
          "actual hairstyle generation",
          "comparison",
          "shortlist persistence",
          "preview review",
          "product notes with example terms",
          "budget comparison",
          "reasoned decision persistence",
          "purchase checklist",
          "family sharing",
          "vote",
          "private source isolation",
          "cross-owner access denied",
          "cross-origin mutation denied",
          "share revocation",
          "workspace deletion",
          "mobile overflow",
        ],
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({
    path: root + "/artifacts/screenshots/browser-failure.png",
    fullPage: true,
  });
  console.error(error);
  process.exitCode = 1;
} finally {
  await context.request
    .delete("http://localhost:3000/api/workspace", {
      headers: { origin: "http://localhost:3000" },
    })
    .catch(() => {});
  await browser.close();
}
