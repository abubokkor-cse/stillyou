import "server-only";
import { read } from "./store";
import { digest } from "./workspace";
import { AppError } from "./response";
import type { Workspace } from "@/lib/types";

export type { Votes } from "@/lib/feedback";
export async function sharedWorkspace(secret: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(secret))
    throw new AppError("This shortlist is no longer shared.", 404);
  const ref = await read<{ workspaceId: string }>(`share:${digest(secret)}`);
  const workspace = ref
    ? await read<Workspace>(`workspace:${ref.workspaceId}`)
    : null;
  if (
    !workspace?.share ||
    workspace.share.token !== secret ||
    Date.parse(workspace.share.expiresAt) <= Date.now() ||
    Date.parse(workspace.expiresAt) <= Date.now()
  )
    throw new AppError("This shortlist is no longer shared.", 404);
  return workspace;
}
