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
        "Please confirm photo permission and storage consent.",
      );
    const takenOn = z.iso.date().parse(data.get("takenOn"));
    if (takenOn > new Date(Date.now() + 86400_000).toISOString().slice(0, 10))
      throw new AppError("Choose the date this photo was taken.");
    const file = data.get("photo");
    if (!(file instanceof File)) throw new AppError("Choose a photo.");
    const image = await normalizeImage(
      new Uint8Array(await file.arrayBuffer()),
    );
    const id = randomUUID();
    key = `${workspace.id}/${id}.jpg`;
    await saveImage(key, image);
    const photo = {
      id,
      storageKey: key,
      takenOn,
      savedAt: new Date().toISOString(),
    };
    const updated = await updateWorkspace(workspace.id, (current) => {
      if (current.photos.length >= 5)
        throw new AppError("You can save up to five reference photos.");
      return {
        ...current,
        photos: [...current.photos, photo],
        baselineId: current.baselineId ?? id,
      };
    });
    key = undefined;
    return json({ workspace: publicWorkspace(updated) }, 201);
  } catch (error) {
    if (key) await deleteImage(key).catch(() => {});
    return errorResponse(error);
  }
}
