import {
  currentWorkspace,
  updateWorkspace,
  publicWorkspace,
} from "@/server/workspace";
import { saveImage, normalizeImage, deleteImage } from "@/server/media";
import { AppError, errorResponse, json, sameOrigin } from "@/server/response";
import { YouCamClient, YouCamError } from "@/lib/youcam";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let savedKey: string | undefined;
  try {
    sameOrigin(request);
    const { id } = await context.params;
    const workspace = (await currentWorkspace())!;
    const preview = workspace.previews.find((item) => item.id === id);
    if (!preview) throw new AppError("Preview not found.", 404);
    if (["success", "error"].includes(preview.state))
      return json({ workspace: publicWorkspace(workspace) });
    if (!preview.taskId && Date.parse(preview.createdAt) > Date.now() - 180_000)
      return json({ workspace: publicWorkspace(workspace) });
    const expired =
      !preview.taskId ||
      Date.parse(preview.createdAt) < Date.now() - 23 * 3600_000;
    const client = new YouCamClient(process.env.YOUCAM_API_KEY ?? "");
    const result = expired
      ? { state: "error" as const, error: "expired" }
      : await client.poll(preview.kind, preview.taskId!);
    if (result.state === "running")
      return json({ workspace: publicWorkspace(workspace) });
    if (result.state === "success" && result.url) {
      const bytes = await normalizeImage(await client.download(result.url));
      savedKey = `${workspace.id}/${preview.id}.jpg`;
      await saveImage(savedKey, bytes);
    }
    if (
      result.state === "success" &&
      !result.color &&
      !result.observation &&
      !savedKey &&
      !result.notice
    )
      throw new YouCamError("unexpected_response");
    const updated = await updateWorkspace(workspace.id, (current) => ({
      ...current,
      previews: current.previews.map((item) =>
        item.id === id
          ? {
              ...item,
              state: result.state,
              error: result.state === "error" ? result.error : undefined,
              color: result.state === "success" ? result.color : undefined,
              observation: result.state === "success" ? result.observation : undefined,
              notice: result.state === "success" ? result.notice : undefined,
              resultKey: savedKey,
            }
          : item,
      ),
    }));
    savedKey = undefined;
    return json({ workspace: publicWorkspace(updated) });
  } catch (error) {
    if (savedKey) await deleteImage(savedKey).catch(() => {});
    return errorResponse(error);
  }
}
