import { cookies } from "next/headers";
import { feedbackSchema, feedbackList, votePreviewId } from "@/lib/feedback";
import { previewName } from "@/lib/hair-tools";
import { sharedWorkspace, type Votes } from "@/server/sharing";
import { digest, token, cookieOptions, currentWorkspace } from "@/server/workspace";
import { read, mutate } from "@/server/store";
import {
  AppError,
  body,
  errorResponse,
  json,
  sameOrigin,
} from "@/server/response";

export const runtime = "nodejs";
type Context = { params: Promise<{ token: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const secret = (await context.params).token;
    const workspace = await sharedWorkspace(secret);
    const votes = (await read<Votes>(`votes:${digest(secret)}`)) ?? {};
    const voter = (await cookies()).get("stillyou_voter")?.value;
    const ownVote = voter ? votes[digest(voter)] : undefined;
    const owner = await currentWorkspace(false);
    return json({
      expiresAt: workspace.share!.expiresAt,
      selected: votePreviewId(ownVote),
      myFeedback: ownVote && typeof ownVote !== "string" ? { name: ownVote.name, recommendation: ownVote.recommendation } : undefined,
      feedback: owner?.id === workspace.id ? feedbackList(votes, workspace.share!.previewIds) : undefined,
      choices: workspace.share!.previewIds.flatMap((id) => {
        const preview = workspace.previews.find(
          (p) => p.id === id && p.state === "success",
        );
        if (!preview) return [];
        const choice = workspace.choices.find((c) => c.id === preview.choiceId);
        return [
          {
            previewId: id,
            name: previewName(preview, choice ? [choice] : []),
            kind: preview.kind,
            votes: Object.values(votes).filter((value) => votePreviewId(value) === id).length,
          },
        ];
      }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const secret = (await context.params).token;
    const workspace = await sharedWorkspace(secret);
    const input = feedbackSchema.parse(await body(request));
    const { previewId } = input;
    if (!workspace.share!.previewIds.includes(previewId))
      throw new AppError("Choose a preview from this shortlist.");
    const jar = await cookies();
    const existing = jar.get("stillyou_voter")?.value;
    const voter =
      existing && /^[A-Za-z0-9_-]{43}$/.test(existing) ? existing : token();
    await mutate<Votes>(`votes:${digest(secret)}`, (current) => {
      const votes = current ?? {};
      if (Object.keys(votes).length >= 100 && !votes[digest(voter)])
        throw new AppError(
          "This shortlist has reached its feedback limit.",
          429,
        );
      return { ...votes, [digest(voter)]: { ...input, updatedAt: new Date().toISOString() } };
    });
    jar.set("stillyou_voter", voter, cookieOptions);
    return json({ voted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
