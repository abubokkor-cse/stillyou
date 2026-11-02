import { z } from "zod";
import {
  currentWorkspace,
  updateWorkspace,
  publicWorkspace,
  digest,
  token,
} from "@/server/workspace";
import { mutate } from "@/server/store";
import {
  AppError,
  body,
  errorResponse,
  json,
  sameOrigin,
} from "@/server/response";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    z.object({ consent: z.literal(true) }).parse(await body(request));
    const workspace = (await currentWorkspace())!;
    if (!workspace.shortlist.length)
      throw new AppError("Add at least one preview to your shortlist.");
    if (workspace.share) {
      await mutate(`share:${digest(workspace.share.token)}`, () => null);
      await mutate(`votes:${digest(workspace.share.token)}`, () => null);
    }
    const secret = token();
    const share = {
      token: secret,
      previewIds: [...workspace.shortlist],
      expiresAt: new Date(
        Math.min(Date.now() + 7 * 86400_000, Date.parse(workspace.expiresAt)),
      ).toISOString(),
    };
    await mutate(`share:${digest(secret)}`, () => ({
      workspaceId: workspace.id,
    }));
    const updated = await updateWorkspace(workspace.id, (current) => ({
      ...current,
      share,
    }));
    return json({ workspace: publicWorkspace(updated) });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const workspace = (await currentWorkspace())!;
    if (workspace.share) {
      await mutate(`share:${digest(workspace.share.token)}`, () => null);
      await mutate(`votes:${digest(workspace.share.token)}`, () => null);
    }
    const updated = await updateWorkspace(workspace.id, (current) => ({
      ...current,
      share: undefined,
    }));
    return json({ workspace: publicWorkspace(updated) });
  } catch (error) {
    return errorResponse(error);
  }
}
