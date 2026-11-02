import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  currentWorkspace,
  updateWorkspace,
  publicWorkspace,
} from "@/server/workspace";
import { normalizeImage, saveImage, deleteImage } from "@/server/media";
import {
  AppError,
  errorResponse,
  form,
  json,
  sameOrigin,
} from "@/server/response";

export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: Request) {
  let key: string | undefined;
  try {
    sameOrigin(request);
    const workspace = (await currentWorkspace())!;
    const data = await form(request);
    if (data.get("consent") !== "true")
      throw new AppError(
        "Confirm you have permission to use this reference image.",
      );
    const name = z.string().trim().min(1).max(80).parse(data.get("name"));
    const kind = z.enum(["hair", "hat"]).parse(data.get("kind"));
    const sellerUrl = z
      .union([
        z.literal(""),
        z.url().refine((url) => new URL(url).protocol === "https:"),
      ])
      .parse(data.get("sellerUrl") ?? "");
    const file = data.get("photo");
    if (!(file instanceof File))
      throw new AppError("Choose a reference image.");
    const image = await normalizeImage(
      new Uint8Array(await file.arrayBuffer()),
    );
    const id = randomUUID();
    const photoId = randomUUID();
    key = `${workspace.id}/${photoId}.jpg`;
    await saveImage(key, image);
    const reference = {
      id: photoId,
      storageKey: key,
      takenOn: new Date().toISOString().slice(0, 10),
      savedAt: new Date().toISOString(),
    };
    const updated = await updateWorkspace(workspace.id, (current) => {
      if (current.choices.length >= 16)
        throw new AppError("You can save up to sixteen references.");
      return {
        ...current,
        choices: [
          ...current.choices,
          { id, name, kind, reference, sellerUrl: sellerUrl || undefined },
        ],
      };
    });
    key = undefined;
    return json({ workspace: publicWorkspace(updated) }, 201);
  } catch (error) {
    if (key) await deleteImage(key).catch(() => {});
    return errorResponse(error);
  }
}
