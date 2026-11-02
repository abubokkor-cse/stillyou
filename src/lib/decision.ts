import type {
  Currency,
  PublicWorkspace,
  Preview,
  ShoppingPreferences,
  Workspace,
} from "./types";

export const priorities: {
  id: ShoppingPreferences["priorities"][number];
  label: string;
}[] = [
  { id: "familiar_style", label: "A familiar style" },
  { id: "budget", label: "Within my budget" },
  { id: "returns", label: "Room to return it" },
  { id: "easy_care", label: "Everyday care" },
];

export function money(minor: number, currency: Currency) {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(
    minor / 100,
  );
}

export function reviewLabel(review?: Preview["review"]) {
  if (!review || review.face === "unchecked" || review.style === "unchecked")
    return "Review needed";
  if (review.face === "changed" || review.style === "misleading")
    return "Differences noted";
  return "Reviewed by you";
}

export function decisionQuestions(
  workspace: PublicWorkspace | Workspace,
  previewId: string,
) {
  const preview = workspace.previews.find((item) => item.id === previewId);
  if (!preview) return ["This preview is no longer available."];
  const choice = workspace.choices.find((item) => item.id === preview.choiceId);
  const product = choice?.product;
  const checks = workspace.checklists?.[choice?.id ?? preview.id];
  const questions: string[] = [];
  const review = reviewLabel(preview.review);
  if (review === "Review needed")
    questions.push(
      "Compare your face and the wig shape with both original images.",
    );
  if (review === "Differences noted")
    questions.push(
      "This preview changes important details. Use the actual product image and a fitting to judge the wig.",
    );
  if (!choice?.sellerUrl)
    questions.push("Save the exact product and selected variant link.");
  if (product?.priceMinor === undefined)
    questions.push(
      "Confirm the price, shipping and tax for your selected variant.",
    );
  if (
    !choice?.policyUrl ||
    !choice.returnPolicy ||
    !product ||
    product.returnStatus === "unknown"
  )
    questions.push("Confirm the return terms for this exact item and shade.");
  else if (product.returnStatus === "final_sale")
    questions.push(
      "This item is marked final sale in your notes. Confirm size and suitability before payment.",
    );
  else if (!checks?.policy)
    questions.push(
      "Read the saved policy and confirm the item's return eligibility.",
    );
  if (!product?.shade)
    questions.push(
      "Confirm the shade using a physical swatch or the seller's guidance.",
    );
  if (!product?.capSize || !checks?.measurements)
    questions.push(
      "Measure your head and compare it with the seller's cap-size guide.",
    );
  if (!product?.fibre || !checks?.comfort)
    questions.push(
      "Ask about fibre, cap construction, comfort and maintenance.",
    );
  if (
    workspace.preferences?.budgetMinor !== undefined &&
    product?.priceMinor !== undefined
  ) {
    if (workspace.preferences.currency !== product.currency)
      questions.push(
        "The budget and item use different currencies. No conversion has been applied.",
      );
    else if (product.priceMinor > workspace.preferences.budgetMinor)
      questions.push(
        `The item is above your ${money(workspace.preferences.budgetMinor, product.currency)} budget, before shipping and tax.`,
      );
  }
  return questions;
}
