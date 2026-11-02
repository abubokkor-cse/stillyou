import { currentWorkspace } from "@/server/workspace";
import { readImage } from "@/server/media";
import { AppError, errorResponse } from "@/server/response";

export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const workspace = (await currentWorkspace())!;
    const key =
      workspace.photos.find((p) => p.id === id)?.storageKey ??
      workspace.choices.find((c) => c.reference.id === id)?.reference
        .storageKey ??
      workspace.previews.find((p) => p.id === id)?.resultKey;
    if (!key) throw new AppError("Image not found.", 404);
    return new Response(new Uint8Array(await readImage(key)), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
        "Content-Disposition": new URL(request.url).searchParams.get("download") === "1" ? `attachment; filename="stillyou-ai-preview-${id.replace(/[^a-zA-Z0-9-]/g, "")}.jpg"` : "inline",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
