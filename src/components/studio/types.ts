import type { PreviewKind } from "@/lib/types";
import type { HairColorOptions } from "@/lib/hair-tools";
export type PreviewRequest = {
  kind: PreviewKind;
  choiceId?: string;
  sourceId?: string;
  inputPreviewId?: string;
  templateId?: string;
  templateCursor?: string;
  keepColor?: boolean;
  hairColor?: HairColorOptions;
  anglePhotoIds?: string[];
  browColor?: string;
  hatGender?: "female" | "male";
};
