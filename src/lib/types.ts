export type PreviewKind = "hair" | "brows" | "hat" | "color" | "hairstyle" | "hair_color" | "extension" | "bangs" | "volume" | "wavy" | "beard" | "hair_type" | "hair_length" | "hair_frizz" | "hair_density";

export type Photo = {
  id: string;
  storageKey: string;
  takenOn: string;
  savedAt: string;
};

export type Choice = {
  id: string;
  name: string;
  kind: "hair" | "hat";
  reference: Photo;
  colorFamily?: string;
  sellerUrl?: string;
  returnPolicy?: string;
  policyUrl?: string;
  policyCheckedOn?: string;
  product?: ProductDetails;
};

export type Preview = {
  id: string;
  kind: PreviewKind;
  choiceId?: string;
  name?: string;
  templateId?: string;
  templateThumb?: string;
  inputPreviewId?: string;
  anglePhotoIds?: string[];
  observation?: { term: string; mapping?: string | number };
  sourceId: string;
  sourceDate: string;
  taskId?: string;
  state: "starting" | "running" | "success" | "error";
  createdAt: string;
  resultKey?: string;
  color?: { name: string; hex: string };
  error?: string;
  notice?: string;
  review?: PreviewReview;
};

export type Currency = "USD" | "GBP" | "EUR" | "CAD" | "BDT";
export type ProductDetails = {
  priceMinor?: number;
  currency: Currency;
  shade: string;
  capSize: string;
  fibre: string;
  returnStatus: "unknown" | "conditional" | "final_sale";
  checkedAt: string;
};
export type PreviewReview = {
  face: "unchecked" | "consistent" | "changed";
  style: "unchecked" | "useful" | "misleading";
  liked: string;
  concern: string;
  reviewedAt: string;
};
export type ShoppingPreferences = {
  priorities: ("familiar_style" | "budget" | "returns" | "easy_care")[];
  budgetMinor?: number;
  currency: Currency;
};

export type Checklist = {
  policy: boolean;
  measurements: boolean;
  comfort: boolean;
  coverage: boolean;
};

export type Workspace = {
  id: string;
  createdAt: string;
  expiresAt: string;
  photos: Photo[];
  baselineId?: string;
  choices: Choice[];
  previews: Preview[];
  shortlist: string[];
  checklists: Record<string, Checklist>;
  preferences?: ShoppingPreferences;
  decision?: { previewId: string; reason: string; decidedAt: string };
  styleDecision?: { previewId: string; reason: string; decidedAt: string };
  share?: { token: string; previewIds: string[]; expiresAt: string };
};

export type PublicWorkspace = Omit<
  Workspace,
  "photos" | "choices" | "previews" | "share"
> & {
  photos: Omit<Photo, "storageKey">[];
  choices: (Omit<Choice, "reference"> & {
    reference: Omit<Photo, "storageKey">;
  })[];
  previews: Omit<Preview, "taskId" | "resultKey">[];
  share?: { token: string; previewIds: string[]; expiresAt: string };
};

export type SharedShortlist = {
  expiresAt: string;
  choices: {
    previewId: string;
    name: string;
    kind: PreviewKind;
    votes: number;
  }[];
  selected?: string;
  myFeedback?: { name: string; recommendation: string };
  feedback?: { previewId: string; name: string; recommendation: string; updatedAt: string }[];
};
