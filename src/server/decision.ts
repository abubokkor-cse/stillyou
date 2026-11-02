import "server-only";
import { z } from "zod";
import type { Workspace } from "@/lib/types";
import { AppError } from "./response";
import { reviewLabel } from "@/lib/decision";
import { isImagePreview } from "@/lib/hair-tools";

const httpsUrl = z.union([
  z.literal(""),
  z
    .url()
    .max(2000)
    .refine((value) => new URL(value).protocol === "https:"),
]);
const currency = z.enum(["USD", "GBP", "EUR", "CAD", "BDT"]);
const amount = z.number().int().min(0).max(100_000_000).optional();
export const decisionPatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("preferences"),
    priorities: z
      .array(z.enum(["familiar_style", "budget", "returns", "easy_care"]))
      .max(4),
    budgetMinor: amount,
    currency,
  }),
  z.object({
    action: z.literal("review"),
    previewId: z.uuid(),
    face: z.enum(["unchecked", "consistent", "changed"]),
    style: z.enum(["unchecked", "useful", "misleading"]),
    liked: z.string().trim().max(400),
    concern: z.string().trim().max(400),
  }),
  z.object({
    action: z.literal("product"),
    choiceId: z.uuid(),
    sellerUrl: httpsUrl,
    priceMinor: amount,
    currency,
    shade: z.string().trim().max(100),
    capSize: z.string().trim().max(100),
    fibre: z.string().trim().max(150),
    returnStatus: z.enum(["unknown", "conditional", "final_sale"]),
    returnPolicy: z.string().trim().max(1000),
    policyUrl: httpsUrl,
  }),
  z.object({
    action: z.literal("decision"),
    previewId: z.uuid(),
    reason: z.string().trim().min(10).max(600),
  }),
  z.object({ action: z.literal("clear_decision") }),
]);

export function applyDecisionPatch(
  workspace: Workspace,
  input: z.infer<typeof decisionPatchSchema>,
): Workspace {
  if (input.action === "preferences")
    return {
      ...workspace,
      decision: undefined,
      preferences: {
        priorities: [...new Set(input.priorities)],
        budgetMinor: input.budgetMinor,
        currency: input.currency,
      },
    };
  if (input.action === "clear_decision")
    return { ...workspace, decision: undefined };
  if (input.action === "product") {
    const existing = workspace.choices.find(
      (choice) => choice.id === input.choiceId,
    );
    if (!existing) throw new AppError("Choice not found.", 404);
    if (
      input.returnStatus !== "unknown" &&
      (!input.policyUrl || !input.returnPolicy)
    )
      throw new AppError(
        "Add a policy source and the exact conditions, or leave returns as unknown.",
      );
    const productChanged =
      existing.sellerUrl !== input.sellerUrl ||
      existing.product?.shade !== input.shade;
    const policyChanged =
      productChanged ||
      existing.policyUrl !== input.policyUrl ||
      existing.returnPolicy !== input.returnPolicy ||
      existing.product?.returnStatus !== input.returnStatus;
    const sizeChanged =
      productChanged || existing.product?.capSize !== input.capSize;
    const fibreChanged =
      productChanged || existing.product?.fibre !== input.fibre;
    const factsChanged =
      policyChanged ||
      sizeChanged ||
      fibreChanged ||
      existing.product?.priceMinor !== input.priceMinor ||
      existing.product?.currency !== input.currency;
    const existingChecks = workspace.checklists?.[existing.id];
    return {
      ...workspace,
      previews:
        existing.product && productChanged
          ? workspace.previews.map((preview) =>
              preview.choiceId === existing.id
                ? { ...preview, review: undefined }
                : preview,
            )
          : workspace.previews,
      choices: workspace.choices.map((choice) =>
        choice.id === input.choiceId
          ? {
              ...choice,
              sellerUrl: input.sellerUrl || undefined,
              returnPolicy: input.returnPolicy || undefined,
              policyUrl: input.policyUrl || undefined,
              policyCheckedOn:
                input.policyUrl && input.returnPolicy
                  ? new Date().toISOString()
                  : undefined,
              product: {
                priceMinor: input.priceMinor,
                currency: input.currency,
                shade: input.shade,
                capSize: input.capSize,
                fibre: input.fibre,
                returnStatus: input.returnStatus,
                checkedAt: new Date().toISOString(),
              },
            }
          : choice,
      ),
      checklists: existingChecks
        ? {
            ...workspace.checklists,
            [existing.id]: {
              ...existingChecks,
              ...(policyChanged ? { policy: false } : {}),
              ...(sizeChanged ? { measurements: false } : {}),
              ...(fibreChanged ? { comfort: false } : {}),
            },
          }
        : workspace.checklists,
      decision:
        factsChanged &&
        workspace.previews.find((p) => p.id === workspace.decision?.previewId)
          ?.choiceId === existing.id
          ? undefined
          : workspace.decision,
    };
  }
  const preview = workspace.previews.find(
    (item) =>
      item.id === input.previewId &&
      item.state === "success" &&
      isImagePreview(item.kind),
  );
  if (!preview) throw new AppError("Choose a completed image preview.", 404);
  if (input.action === "review")
    return {
      ...workspace,
      previews: workspace.previews.map((item) =>
        item.id === preview.id
          ? {
              ...item,
              review: {
                face: input.face,
                style: input.style,
                liked: input.liked,
                concern: input.concern,
                reviewedAt: new Date().toISOString(),
              },
            }
          : item,
      ),
      decision:
        workspace.decision?.previewId === preview.id
          ? undefined
          : workspace.decision,
      styleDecision: workspace.styleDecision?.previewId === preview.id ? undefined : workspace.styleDecision,
    };
  if (!workspace.shortlist.includes(preview.id))
    throw new AppError("Add this look to your shortlist first.");
  if (reviewLabel(preview.review) === "Review needed")
    throw new AppError(
      "Review your face and the style before saving a decision.",
    );
  return {
    ...workspace,
    [preview.kind === "hair" ? "decision" : "styleDecision"]: {
      previewId: preview.id,
      reason: input.reason,
      decidedAt: new Date().toISOString(),
    },
  };
}
