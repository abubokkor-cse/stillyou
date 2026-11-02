import { z } from "zod";
import type { PreviewKind } from "./types";

export const templateKinds = ["hairstyle", "extension", "bangs", "volume", "wavy", "beard"] as const;
export type TemplateKind = (typeof templateKinds)[number];
export const observationKinds = ["hair_type", "hair_length", "hair_frizz", "hair_density"] as const;
export type ObservationKind = (typeof observationKinds)[number];
export const previewKinds = ["hair", "brows", "hat", "color", ...templateKinds, "hair_color", ...observationKinds] as const;
export const hairPresets = [
  "Jet Black", "Chocolate Brown", "Honey Blonde", "Platinum Blonde", "Ash Gray",
  "Rose Gold", "Burgundy", "Copper Red", "Lavender", "Teal Blue",
  "Dark Brown/Caramel Blonde", "Jet Black/Silver Gray", "Ash Brown/Lavender",
  "Rose Gold/Peach Blonde", "Burgundy/Magenta Pink", "Deep Blue/Teal Green",
  "Plum Purple/Pastel Lilac", "Copper Red/Golden Blonde", "Dark Gray/Ice Blonde", "Midnight Blue/Denim Blue",
] as const;
export const kindLabels: Record<PreviewKind, string> = {
  hair: "Wig preview", brows: "Brow preview", hat: "Hat preview", color: "Colour family",
  hairstyle: "Haircut & style", extension: "Extensions", bangs: "Bangs", volume: "Volume",
  wavy: "Waves & curls", beard: "Beard style", hair_color: "Hair colour",
  hair_type: "Hair type", hair_length: "Hair length", hair_frizz: "Frizz", hair_density: "Hair density",
};
export const isTemplateKind = (kind: string): kind is TemplateKind => templateKinds.some((value) => value === kind);
export const isObservation = (kind: string): kind is ObservationKind => observationKinds.some((value) => value === kind);
export const isImagePreview = (kind: PreviewKind) => kind !== "color" && !isObservation(kind);
export const canLayer = (kind: PreviewKind) => kind === "hair_color" || isTemplateKind(kind);
export const previewName = (preview: { kind: PreviewKind; name?: string; choiceId?: string }, choices: { id: string; name: string }[] = []) =>
  preview.name || choices.find((choice) => choice.id === preview.choiceId)?.name || kindLabels[preview.kind];

export const colorOptionsSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("preset"), preset: z.enum(hairPresets) }),
  z.object({
    mode: z.literal("custom"), pattern: z.enum(["full", "ombre"]),
    colors: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).min(1).max(2),
    intensity: z.number().int().min(0).max(100), shine: z.number().int().min(0).max(100),
    blend: z.number().int().min(0).max(100), offset: z.number().min(-0.99).max(0.99),
  }).refine((value) => value.colors.length === (value.pattern === "full" ? 1 : 2), "Choose the colours for this pattern."),
]);
export type HairColorOptions = z.infer<typeof colorOptionsSchema>;
export const previewInputSchema = z.object({
  kind: z.enum(previewKinds), sourceId: z.uuid(), choiceId: z.uuid().optional(),
  inputPreviewId: z.uuid().optional(), templateId: z.string().min(1).max(180).optional(),
  templateCursor: z.string().max(2048).optional(), keepColor: z.boolean().optional(),
  hairColor: colorOptionsSchema.optional(), anglePhotoIds: z.array(z.uuid()).length(2).optional(),
  browColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  hatGender: z.enum(["female", "male"]).optional(), consent: z.literal(true),
}).superRefine((value, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: "custom", message });
  if (isTemplateKind(value.kind) && !value.templateId) fail("Choose a style from the gallery.");
  if (value.kind === "hair_color" && !value.hairColor) fail("Choose a hair colour.");
  if (["hair_type", "hair_frizz"].includes(value.kind) && (!value.anglePhotoIds || new Set([value.sourceId, ...value.anglePhotoIds]).size !== 3)) fail("Choose three different front, right and left photos.");
  if (value.inputPreviewId && !canLayer(value.kind)) fail("Use an original photo for this tool.");
  if (value.choiceId && !["hair", "hat"].includes(value.kind)) fail("Style experiments cannot be attached to a wig product.");
});

export type HairTemplate = { id: string; title: string; thumb: string; category: string; keepColor?: boolean };
export type TemplatePage = { templates: HairTemplate[]; next?: string };
