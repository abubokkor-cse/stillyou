import { z } from "zod";
import { templateKinds } from "@/lib/hair-tools";
import { templatePage } from "@/server/templates";
import { currentWorkspace } from "@/server/workspace";
import { json, errorResponse } from "@/server/response";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    await currentWorkspace();
    const params = new URL(request.url).searchParams;
    const kind = z.enum(templateKinds).parse(params.get("kind"));
    const cursor = z.string().max(2048).optional().parse(params.get("cursor") || undefined);
    return json(await templatePage(kind, cursor));
  } catch (error) {
    return errorResponse(error);
  }
}
