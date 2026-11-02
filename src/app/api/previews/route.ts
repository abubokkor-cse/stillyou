import { randomUUID } from "node:crypto";
import sharp from "sharp";
import {
  currentWorkspace,
  updateWorkspace,
  reservePreview,
  publicWorkspace,
} from "@/server/workspace";
import { readImage } from "@/server/media";
import {
  AppError,
  body,
  errorResponse,
  json,
  sameOrigin,
} from "@/server/response";
import { YouCamClient, YouCamError, buildTaskBody } from "@/lib/youcam";
import { isTemplateKind, kindLabels, previewInputSchema } from "@/lib/hair-tools";
import { templatePage } from "@/server/templates";
import { resolvePreviewInput } from "@/server/preview-input";

export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(request: Request) {
  let job: { workspaceId: string; previewId: string } | undefined;
  try {
    sameOrigin(request);
    const input = previewInputSchema.parse(await body(request));
    const workspace = (await currentWorkspace())!;
    if (!process.env.YOUCAM_API_KEY)
      throw new YouCamError("not_configured", 503);
    const { source, choice, parent, angles } = resolvePreviewInput(workspace, input);
    const template = isTemplateKind(input.kind)
      ? (await templatePage(input.kind, input.templateCursor)).templates.find((item) => item.id === input.templateId)
      : undefined;
    if (isTemplateKind(input.kind) && !template) throw new AppError("Refresh the gallery and choose an available style.");
    let sourceBytes = await readImage(parent?.resultKey ?? source.storageKey);
    const angleBytes = await Promise.all(angles.map((photo) => readImage(photo.storageKey)));
    if (angleBytes.length) {
      const sizes = await Promise.all([sourceBytes, ...angleBytes].map((bytes) => sharp(bytes).metadata()));
      if (sizes.some((size) => size.width !== sizes[0].width || size.height !== sizes[0].height))
        throw new AppError("Use front, right and left photos with the same dimensions.");
    }
    if (input.kind === "hair_color") sourceBytes = await sharp(sourceBytes).resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).jpeg().toBuffer();
    const name = choice?.name ?? (template ? `${kindLabels[input.kind]} · ${template.title}` : input.hairColor?.mode === "preset" ? `Hair colour · ${input.hairColor.preset}` : kindLabels[input.kind]);
    await reservePreview(workspace.id);
    const id = randomUUID();
    await updateWorkspace(workspace.id, (current) => {
      if (
        current.previews.some(
          (preview) =>
            ["starting", "running"].includes(preview.state) &&
            Date.parse(preview.createdAt) > Date.now() - 180_000,
        )
      )
        throw new AppError("Let your current preview finish first.", 409);
      if (current.previews.length >= 100)
        throw new AppError("This workspace has reached its preview limit.");
      return {
        ...current,
        previews: [
          ...current.previews,
          {
            id,
            kind: input.kind,
            sourceId: source.id,
            sourceDate: source.takenOn,
            choiceId: choice?.id,
            name,
            templateId: template?.id,
            templateThumb: template?.thumb,
            inputPreviewId: parent?.id,
            anglePhotoIds: angles.map((photo) => photo.id),
            state: "starting",
            createdAt: new Date().toISOString(),
          },
        ],
      };
    });
    job = { workspaceId: workspace.id, previewId: id };
    const client = new YouCamClient(process.env.YOUCAM_API_KEY);
    const src = await client.upload(sourceBytes);
    const angleFileIds: string[] = [];
    for (const bytes of angleBytes) angleFileIds.push(await client.upload(bytes));
    const ref = choice
      ? await client.upload(await readImage(choice.reference.storageKey))
      : undefined;
    const taskId = await client.start(
      input.kind,
      buildTaskBody(input.kind, src, {
        referenceId: ref,
        browColor: input.browColor,
        hatGender: input.hatGender,
        templateId: template?.id,
        keepColor: template?.keepColor || input.keepColor,
        hairColor: input.hairColor,
        angleFileIds,
      }),
    );
    const updated = await updateWorkspace(workspace.id, (current) => ({
      ...current,
      previews: current.previews.map((preview) =>
        preview.id === id ? { ...preview, taskId, state: "running" } : preview,
      ),
    }));
    return json({ workspace: publicWorkspace(updated), previewId: id }, 202);
  } catch (error) {
    if (job)
      await updateWorkspace(job.workspaceId, (current) => ({
        ...current,
        previews: current.previews.map((preview) =>
          preview.id === job!.previewId
            ? {
                ...preview,
                state: "error",
                error:
                  error instanceof YouCamError ? error.code : "provider_error",
              }
            : preview,
        ),
      })).catch(() => {});
    return errorResponse(error);
  }
}
