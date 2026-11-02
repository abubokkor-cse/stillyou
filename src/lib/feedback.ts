import { z } from "zod";

export const feedbackSchema = z.object({
  previewId: z.uuid(),
  name: z.string().trim().min(1, "Enter your name or a nickname.").max(60),
  recommendation: z.string().trim().max(500).default(""),
});
export type FamilyFeedback = z.infer<typeof feedbackSchema> & { updatedAt: string };
export type Votes = Record<string, string | FamilyFeedback>;
export const votePreviewId = (vote: string | FamilyFeedback | undefined) => typeof vote === "string" ? vote : vote?.previewId;
export function feedbackList(votes: Votes, allowed: string[]) {
  return Object.values(votes).flatMap((vote) => typeof vote !== "string" && allowed.includes(vote.previewId) ? [vote] : []);
}
