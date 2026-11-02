import { sharedWorkspace } from "@/server/sharing";
import { readImage } from "@/server/media";
import { AppError, errorResponse } from "@/server/response";

export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string; id: string }> },
) {
  try {
    const { token, id } = await context.params;
    const workspace = await sharedWorkspace(token);
    const preview = workspace.previews.find(
      (item) => item.id === id && item.state === "success",
    );
    if (!workspace.share!.previewIds.includes(id) || !preview?.resultKey)
      throw new AppError("Image not shared.", 404);
    return new Response(new Uint8Array(await readImage(preview.resultKey)), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
