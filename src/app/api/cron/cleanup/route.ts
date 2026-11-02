import { listExpiredWorkspaces } from "@/server/store";
import { destroyWorkspace } from "@/server/workspace";
import { json, errorResponse } from "@/server/response";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return json({ error: "Unauthorized" }, 401);
  try {
    const expired = await listExpiredWorkspaces();
    for (const workspace of expired) await destroyWorkspace(workspace);
    return json({ deleted: expired.length });
  } catch (error) {
    return errorResponse(error);
  }
}
