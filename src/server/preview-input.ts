import "server-only";
import type { z } from "zod";
import type { Workspace } from "@/lib/types";
import { isImagePreview, previewInputSchema } from "@/lib/hair-tools";
import { AppError } from "./response";

export function resolvePreviewInput(workspace: Workspace, input: z.infer<typeof previewInputSchema>) {
  const source = workspace.photos.find((photo) => photo.id === input.sourceId);
  if (!source) throw new AppError("Choose a saved photo.");
  const choice = workspace.choices.find((item) => item.id === input.choiceId);
  if (["hair", "hat"].includes(input.kind) && (!choice || choice.kind !== input.kind))
    throw new AppError("Choose a matching reference.");
  const parent = input.inputPreviewId ? workspace.previews.find((item) => item.id === input.inputPreviewId && item.state === "success" && item.resultKey && isImagePreview(item.kind)) : undefined;
  if (input.inputPreviewId && (!parent || parent.sourceId !== source.id))
    throw new AppError("Choose a completed look based on this original photo.");
  const angles = ["hair_type", "hair_frizz"].includes(input.kind) ? (input.anglePhotoIds ?? []).map((id) => {
    const photo = workspace.photos.find((item) => item.id === id);
    if (!photo) throw new AppError("Choose your saved right and left photos.");
    return photo;
  }) : [];
  return { source, choice, parent, angles };
}
