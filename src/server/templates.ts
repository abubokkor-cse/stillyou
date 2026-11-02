import "server-only";
import { YouCamClient } from "@/lib/youcam";
import type { TemplateKind, TemplatePage } from "@/lib/hair-tools";
import { read, mutate } from "./store";
import { digest } from "./workspace";

export async function templatePage(kind: TemplateKind, cursor?: string): Promise<TemplatePage> {
  const key = `templates:${kind}:${digest(cursor || "first")}`;
  const cached = await read<{ expiresAt: number; page: TemplatePage }>(key);
  if (cached && cached.expiresAt > Date.now()) return cached.page;
  const page = await new YouCamClient(process.env.YOUCAM_API_KEY ?? "").templates(kind, cursor);
  await mutate(key, () => ({ page, expiresAt: Date.now() + 3600_000 }));
  return page;
}
