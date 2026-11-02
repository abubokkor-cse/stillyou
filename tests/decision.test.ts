import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  applyDecisionPatch,
  decisionPatchSchema,
} from "../src/server/decision";
import { decisionQuestions, reviewLabel } from "../src/lib/decision";
import { publicWorkspace } from "../src/server/workspace";
import type { Workspace } from "../src/lib/types";

const choiceId = randomUUID();
const previewId = randomUUID();
function fixture(): Workspace {
  return {
    id: randomUUID(),
    createdAt: "2026-10-20",
    expiresAt: "2026-11-19",
    photos: [],
    choices: [
      {
        id: choiceId,
        kind: "hair",
        name: "Test wig",
        reference: {
          id: randomUUID(),
          storageKey: "private.jpg",
          takenOn: "2026-10-20",
          savedAt: "2026-10-20",
        },
      },
    ],
    previews: [
      {
        id: previewId,
        choiceId,
        kind: "hair",
        sourceId: randomUUID(),
        sourceDate: "2026-10-20",
        state: "success",
        createdAt: "2026-10-20",
        review: {
          face: "consistent",
          style: "useful",
          liked: "Familiar length",
          concern: "Need shade swatch",
          reviewedAt: "2026-10-20",
        },
      },
    ],
    shortlist: [previewId],
    checklists: {},
  };
}
const facts = {
  action: "product" as const,
  choiceId,
  sellerUrl: "https://example.com/wig?variant=1",
  priceMinor: 25000,
  currency: "USD" as const,
  shade: "Brown",
  capSize: "Average",
  fibre: "Synthetic",
  returnStatus: "conditional" as const,
  returnPolicy: "Unused with tags, within 30 days.",
  policyUrl: "https://example.com/returns",
};
const choose = {
  action: "decision" as const,
  previewId,
  reason: "The familiar length suits my budget, pending a fitting.",
};

describe("purchase decisions", () => {
  it("does not reuse a preview review after the recorded variant changes", () => {
    const w = applyDecisionPatch(applyDecisionPatch(fixture(), facts), choose);
    const changed = applyDecisionPatch(w, { ...facts, shade: "Blonde", sellerUrl: "https://example.com/wig?variant=2" });
    expect(changed.previews[0].review).toBeUndefined();
    expect(changed.decision).toBeUndefined();
    expect(() => applyDecisionPatch(changed, choose)).toThrow("Review your face");
  });
  it("requires a shortlisted, completed, owned image preview and a personal review", () => {
    for (const mutate of [
      (w: Workspace) => {
        w.shortlist = [];
      },
      (w: Workspace) => {
        w.previews[0].review = undefined;
      },
      (w: Workspace) => {
        w.previews[0].state = "running";
      },
      (w: Workspace) => {
        w.previews[0].kind = "color";
      },
      (w: Workspace) => {
        w.previews[0].id = randomUUID();
      },
    ]) {
      const w = fixture();
      mutate(w);
      expect(() => applyDecisionPatch(w, choose)).toThrow();
    }
  });
  it("saves a non-wig style pick separately from the wig purchase decision", () => {
    const w = applyDecisionPatch(fixture(), choose);
    const stylePreviewId = randomUUID();
    w.previews.push({
      ...w.previews[0],
      id: stylePreviewId,
      kind: "hairstyle",
      choiceId: undefined,
    });
    w.shortlist.push(stylePreviewId);
    const saved = applyDecisionPatch(w, {
      ...choose,
      previewId: stylePreviewId,
    });
    expect(saved.decision).toEqual(w.decision);
    expect(saved.styleDecision?.previewId).toBe(stylePreviewId);
    expect(saved.styleDecision?.reason).toBe(choose.reason);
  });
  it("keeps the shopper's reservations when choosing, without inventing an accuracy score", () => {
    const w = fixture();
    w.previews[0].review!.face = "changed";
    const saved = applyDecisionPatch(w, choose);
    expect(saved.decision?.reason).toBe(choose.reason);
    expect(reviewLabel(saved.previews[0].review)).toBe("Differences noted");
    expect(
      decisionQuestions(saved, previewId).some((q) =>
        q.includes("changes important details"),
      ),
    ).toBe(true);
    expect(publicWorkspace(saved).previews[0].review?.concern).toBe(
      "Need shade swatch",
    );
  });
  it("cannot mark returns confirmed without both a source and terms", () => {
    for (const input of [
      { ...facts, policyUrl: "" },
      { ...facts, returnPolicy: "" },
    ])
      expect(() => applyDecisionPatch(fixture(), input)).toThrow(
        "policy source",
      );
    const w = applyDecisionPatch(fixture(), {
      ...facts,
      returnStatus: "unknown",
      policyUrl: "",
      returnPolicy: "",
    });
    expect(
      decisionQuestions(w, previewId).some((q) => q.includes("return terms")),
    ).toBe(true);
  });
  it("invalidates only the affected checklist entries when facts change", () => {
    let w = applyDecisionPatch(fixture(), facts);
    w.checklists[choiceId] = {
      policy: true,
      measurements: true,
      comfort: true,
      coverage: true,
    };
    w = applyDecisionPatch(w, choose);
    const changed = applyDecisionPatch(w, { ...facts, capSize: "Petite" });
    expect(changed.checklists[choiceId]).toEqual({
      policy: true,
      measurements: false,
      comfort: true,
      coverage: true,
    });
    expect(changed.decision).toBeUndefined();
    expect(
      applyDecisionPatch(w, {
        ...facts,
        returnPolicy: "Final sale",
        returnStatus: "final_sale",
      }).checklists[choiceId].policy,
    ).toBe(false);
    expect(
      applyDecisionPatch(w, { ...facts, fibre: "Human hair" }).checklists[
        choiceId
      ].comfort,
    ).toBe(false);
  });
  it("keeps an unchanged decision but requires reconfirmation after price or priorities change", () => {
    const w = applyDecisionPatch(applyDecisionPatch(fixture(), facts), choose);
    expect(applyDecisionPatch(w, facts).decision).toEqual(w.decision);
    expect(
      applyDecisionPatch(w, { ...facts, priceMinor: 29000 }).decision,
    ).toBeUndefined();
    expect(
      applyDecisionPatch(w, {
        action: "preferences",
        priorities: ["budget"],
        currency: "USD",
        budgetMinor: 20000,
      }).decision,
    ).toBeUndefined();
  });
  it("keeps price comparisons in the same currency and leaves final sale visible", () => {
    const w = applyDecisionPatch(fixture(), {
      ...facts,
      returnStatus: "final_sale",
    });
    w.preferences = {
      priorities: ["budget", "returns"],
      budgetMinor: 20000,
      currency: "USD",
    };
    expect(
      decisionQuestions(w, previewId).some((q) => q.includes("above your")),
    ).toBe(true);
    expect(
      decisionQuestions(w, previewId).some((q) => q.includes("final sale")),
    ).toBe(true);
    w.preferences.currency = "GBP";
    expect(
      decisionQuestions(w, previewId).some((q) => q.includes("No conversion")),
    ).toBe(true);
    expect(
      decisionQuestions(w, previewId).some((q) => q.includes("above your")),
    ).toBe(false);
  });
  it("rejects unsafe links, invalid amounts and empty decision reasons", () => {
    for (const input of [
      { ...facts, sellerUrl: "javascript:alert(1)" },
      { ...facts, priceMinor: -1 },
      { ...facts, priceMinor: 1.2 },
      { ...choose, reason: "   " },
    ])
      expect(decisionPatchSchema.safeParse(input).success).toBe(false);
  });
});
