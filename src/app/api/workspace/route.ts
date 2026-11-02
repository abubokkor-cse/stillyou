import { z } from "zod";
import { isImagePreview } from "@/lib/hair-tools";
import {
  body,
  errorResponse,
  json,
  sameOrigin,
  AppError,
} from "@/server/response";
import {
  currentWorkspace,
  createWorkspace,
  updateWorkspace,
  publicWorkspace,
  destroyWorkspace,
  clearSession,
  updateChecklist,
} from "@/server/workspace";

export const runtime = "nodejs";
export async function GET() {
  try {
    const workspace = await currentWorkspace(false);
    return json({
      workspace: workspace ? publicWorkspace(workspace) : null,
      previewReady: Boolean(process.env.YOUCAM_API_KEY),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    return json({ workspace: publicWorkspace(await createWorkspace()) });
  } catch (error) {
    return errorResponse(error);
  }
}
const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("baseline"), photoId: z.string() }),
  z.object({ action: z.literal("shortlist"), previewId: z.string() }),
  z.object({
    action: z.literal("checklist"),
    previewId: z.string(),
    key: z.enum(["policy", "measurements", "comfort", "coverage"]),
    value: z.boolean(),
  }),
]);
export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    const input = patchSchema.parse(await body(request));
    const workspace = (await currentWorkspace())!;
    const updated = await updateWorkspace(workspace.id, (current) => {
      if (input.action === "baseline") {
        if (!current.photos.some((photo) => photo.id === input.photoId))
          throw new AppError("Photo not found.", 404);
        return { ...current, baselineId: input.photoId };
      }
      if (input.action === "shortlist") {
        if (
          !current.previews.some(
            (preview) =>
              preview.id === input.previewId &&
              preview.state === "success" &&
              isImagePreview(preview.kind),
          )
        )
          throw new AppError("Save a completed preview.");
        const shortlist = current.shortlist.includes(input.previewId)
          ? current.shortlist.filter((id) => id !== input.previewId)
          : [...current.shortlist, input.previewId];
        if (shortlist.length > 6)
          throw new AppError("Keep up to six choices in your shortlist.");
        return {
          ...current,
          shortlist,
          styleDecision: current.styleDecision && shortlist.includes(current.styleDecision.previewId) ? current.styleDecision : undefined,
          decision:
            current.decision && shortlist.includes(current.decision.previewId)
              ? current.decision
              : undefined,
        };
      }
      if (input.action === "checklist")
        return updateChecklist(
          current,
          input.previewId,
          input.key,
          input.value,
        );
      return current;
    });
    return json({ workspace: publicWorkspace(updated) });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const workspace = (await currentWorkspace())!;
    await destroyWorkspace(workspace);
    await clearSession();
    return json({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
