import { body, errorResponse, json, sameOrigin } from "@/server/response";
import {
  currentWorkspace,
  publicWorkspace,
  updateWorkspace,
} from "@/server/workspace";
import { applyDecisionPatch, decisionPatchSchema } from "@/server/decision";

export const runtime = "nodejs";
export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    const input = decisionPatchSchema.parse(await body(request));
    const workspace = (await currentWorkspace())!;
    const updated = await updateWorkspace(workspace.id, (current) =>
      applyDecisionPatch(current, input),
    );
    return json({ workspace: publicWorkspace(updated) });
  } catch (error) {
    return errorResponse(error);
  }
}
