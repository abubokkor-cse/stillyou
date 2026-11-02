import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { read, mutate } from "./store";
import { AppError } from "./response";
import { deleteImage } from "./media";
import type { Checklist, PublicWorkspace, Workspace } from "@/lib/types";
import { isImagePreview } from "@/lib/hair-tools";

const COOKIE = "stillyou_session";
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const token = () => randomBytes(32).toString("base64url");
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export async function currentWorkspace(required = true) {
  const secret = (await cookies()).get(COOKIE)?.value;
  const workspace =
    secret && /^[A-Za-z0-9_-]{43}$/.test(secret)
      ? await read<Workspace>(`workspace:${digest(secret)}`)
      : null;
  if (workspace && Date.parse(workspace.expiresAt) > Date.now())
    return workspace;
  if (workspace) await destroyWorkspace(workspace);
  if (required)
    throw new AppError("Start a private workspace to continue.", 401);
  return null;
}

export async function createWorkspace() {
  const current = await currentWorkspace(false);
  if (current) return current;
  const secret = token();
  const workspace: Workspace = {
    id: digest(secret),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
    photos: [],
    choices: [],
    previews: [],
    shortlist: [],
    checklists: {},
  };
  await mutate<Workspace>(`workspace:${workspace.id}`, () => workspace);
  (await cookies()).set(COOKIE, secret, cookieOptions);
  return workspace;
}

export async function updateWorkspace(
  id: string,
  change: (workspace: Workspace) => Workspace,
) {
  return (await mutate<Workspace>(`workspace:${id}`, (workspace) => {
    if (!workspace || Date.parse(workspace.expiresAt) <= Date.now())
      throw new AppError("This workspace has expired.", 410);
    return change(workspace);
  }))!;
}

export function publicWorkspace(workspace: Workspace): PublicWorkspace {
  const photo = (item: Workspace["photos"][number]) => ({
    id: item.id,
    takenOn: item.takenOn,
    savedAt: item.savedAt,
  });
  return {
    ...workspace,
    photos: workspace.photos.map(photo),
    choices: workspace.choices.map((item) => ({
      ...item,
      reference: photo(item.reference),
    })),
    previews: workspace.previews.map((item) => ({
      id: item.id,
      kind: item.kind,
      choiceId: item.choiceId,
      name: item.name,
      templateId: item.templateId,
      templateThumb: item.templateThumb,
      inputPreviewId: item.inputPreviewId,
      anglePhotoIds: item.anglePhotoIds,
      observation: item.observation,
      sourceId: item.sourceId,
      sourceDate: item.sourceDate,
      state: item.state,
      createdAt: item.createdAt,
      color: item.color,
      error: item.error,
      notice: item.notice,
      review: item.review,
    })),
  };
}

export async function destroyWorkspace(workspace: Workspace) {
  const latest = await mutate<Workspace>(
    `workspace:${workspace.id}`,
    (current) =>
      current ? { ...current, expiresAt: "1970-01-01T00:00:00.000Z" } : null,
  );
  if (!latest) return;
  workspace = latest;
  if (workspace.share) {
    await mutate(`share:${digest(workspace.share.token)}`, () => null);
    await mutate(`votes:${digest(workspace.share.token)}`, () => null);
  }
  const keys = new Set([
    ...workspace.photos.map((p) => p.storageKey),
    ...workspace.choices.map((c) => c.reference.storageKey),
    ...workspace.previews.flatMap((p) => (p.resultKey ? [p.resultKey] : [])),
  ]);
  await Promise.all([...keys].map(deleteImage));
  await mutate(`workspace:${workspace.id}`, () => null);
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export function updateChecklist(
  workspace: Workspace,
  previewId: string,
  key: keyof Checklist,
  value: boolean,
): Workspace {
  const preview = workspace.previews.find(
    (item) =>
      item.id === previewId &&
      item.state === "success" &&
      isImagePreview(item.kind),
  );
  if (!preview) throw new AppError("Preview not found.", 404);
  const id = preview.choiceId ?? preview.id;
  const current = workspace.checklists?.[id] ?? {
    policy: false,
    measurements: false,
    comfort: false,
    coverage: false,
  };
  return {
    ...workspace,
    checklists: { ...workspace.checklists, [id]: { ...current, [key]: value } },
  };
}

export async function reservePreview(workspaceId: string) {
  const date = new Date().toISOString().slice(0, 10);
  for (const [key, limit] of [
    [
      `daily:${date}:global`,
      Number(process.env.MAX_GLOBAL_DAILY_PREVIEWS || 100),
    ],
    [
      `daily:${date}:${workspaceId}`,
      Number(process.env.MAX_DAILY_PREVIEWS || 20),
    ],
  ] as const) {
    await mutate<number>(key, (count) => {
      if ((count ?? 0) >= limit)
        throw new AppError(
          "Today's preview limit has been reached. Your saved choices are still available.",
          429,
        );
      return (count ?? 0) + 1;
    });
  }
}
