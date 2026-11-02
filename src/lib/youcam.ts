import { z } from "zod";
import type { PreviewKind } from "./types";
import { isTemplateKind, isObservation, type TemplateKind, type TemplatePage, type HairColorOptions } from "./hair-tools";

const API_ORIGIN = "https://yce-api-01.makeupar.com";
const paths: Record<PreviewKind, string> = {
  hair: "/s2s/v2.1/task/hair-transfer",
  color: "/s2s/v2.0/task/skin-tone-analysis",
  brows: "/s2s/v2.0/task/makeup-vto",
  hat: "/s2s/v2.0/task/hat",
  hairstyle: "/s2s/v2.1/task/hair-transfer",
  hair_color: "/s2s/v2.0/task/hair-color",
  extension: "/s2s/v2.0/task/hair-ext",
  bangs: "/s2s/v2.0/task/hair-bang",
  volume: "/s2s/v2.0/task/hair-vol",
  wavy: "/s2s/v2.0/task/hair-curl",
  beard: "/s2s/v2.0/task/beard-style",
  hair_type: "/s2s/v2.0/task/hair-type-detection",
  hair_length: "/s2s/v2.0/task/hair-length-detection",
  hair_frizz: "/s2s/v2.0/task/hair-frizziness-detection",
  hair_density: "/s2s/v2.0/task/hair-density-detection",
};

export class YouCamError extends Error {
  constructor(
    public code: string,
    public status = 502,
  ) {
    super(code);
    this.name = "YouCamError";
  }
}

const messages: Record<string, string> = {
  error_mismatch_image_size: "Use three photos with the same dimensions for this observation.",
  error_face_angle_invalid: "Check the photo guide for this tool and try the requested angle.",
  error_insufficient_lighting: "Try again with your hair and face evenly lit.",
  error_face_position_too_small: "Move closer so your face and hair are clear in the photo.",
  error_below_min_image_size: "Use a photo at least 320 pixels wide and tall.",
  not_configured:
    "Preview service is not connected yet. Your saved photos and shortlist still work.",
  error_hair_too_short:
    "This photo has too little visible hair for this preview. Choose a saved reference photo with more visible hair.",
  error_no_shoulder: "Try a photo that includes your head and shoulders.",
  error_no_face:
    "The service could not detect a face in one of the images. Check both your photo and the wig reference. Faceless mannequins and detached wigs may be rejected.",
  error_large_face_angle: "Try a photo looking straight towards the camera.",
  error_face_pose: "Try a front-facing photo with your head upright.",
  error_insufficient_landmarks:
    "Your face could not be read clearly. Try even lighting and an unobstructed face.",
  InvalidApiKey: "The preview service needs its API connection checked.",
  InvalidAccessToken: "The preview service needs its API connection checked.",
  Unauthorized: "The preview service needs its API connection checked.",
  timeout:
    "The preview is taking longer than expected. You can check it again in a moment.",
  expired:
    "This preview request has expired. Start a new preview when you are ready.",
};

export function previewErrorMessage(code: string) {
  return (
    messages[code] ??
    "This preview could not be completed. Try another clear photo or reference."
  );
}

export function buildTaskBody(
  kind: PreviewKind,
  sourceId: string,
  options: {
    referenceId?: string;
    browColor?: string;
    hatGender?: "female" | "male";
    templateId?: string;
    keepColor?: boolean;
    hairColor?: HairColorOptions;
    angleFileIds?: string[];
  },
) {
  const src = { src_file_id: sourceId };
  if (isTemplateKind(kind)) {
    if (!options.templateId) throw new YouCamError("missing_template", 400);
    return { ...src, template_id: options.templateId, ...(kind === "hairstyle" ? { hair_color: options.keepColor ? "src" : "ref" } : {}) };
  }
  if (kind === "hair_type" || kind === "hair_frizz") {
    if (options.angleFileIds?.length !== 2) throw new YouCamError("missing_angles", 400);
    return { src_file_ids: [sourceId, ...options.angleFileIds] };
  }
  if (isObservation(kind)) return src;
  if (kind === "hair_color") {
    const color = options.hairColor;
    if (!color) throw new YouCamError("missing_color", 400);
    if (color.mode === "preset") return { ...src, preset: color.preset };
    return {
      ...src,
      pattern: { name: color.pattern, ...(color.pattern === "ombre" ? { blend_strength: color.blend, line_offset: color.offset, coloring_section: "top" } : {}) },
      palettes: color.colors.map((value) => ({ color: value, color_intensity: color.intensity, shine_intensity: color.shine })),
    };
  }
  if (kind === "hair" || kind === "hat") {
    if (!options.referenceId) throw new YouCamError("missing_reference", 400);
    return kind === "hair"
      ? { ...src, ref_file_id: options.referenceId, hair_color: "ref" }
      : {
          ...src,
          ref_file_id: options.referenceId,
          gender: options.hatGender ?? "female",
          style: "random",
        };
  }
  if (kind === "color") return { ...src, face_angle_strictness_level: "high" };
  const color = z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .parse(options.browColor ?? "#574237");
  return {
    ...src,
    effects: [
      {
        category: "skin_smooth",
        skinSmoothStrength: 0,
        skinSmoothColorIntensity: 0,
      },
      {
        category: "eyebrows",
        pattern: { type: "color" },
        palettes: [{ color, colorIntensity: 55, texture: "matte" }],
      },
    ],
  };
}

const pollSchema = z.object({
  data: z.object({
    task_status: z.string(),
    error: z.string().nullish(),
    failure_reason: z.string().optional(),
    results: z.unknown().optional(),
  }),
});

export type TaskResult =
  | { state: "running" }
  | { state: "error"; error: string }
  | {
      state: "success";
      url?: string;
      color?: { name: string; hex: string };
      notice?: string;
      observation?: { term: string; mapping?: string | number };
    };

export function parseTaskResult(
  kind: PreviewKind,
  payload: unknown,
): TaskResult {
  const { data } = pollSchema.parse(payload);
  if (data.task_status === "error")
    return {
      state: "error",
      error: data.error || data.failure_reason || "provider_error",
    };
  if (["running", "queued", "processing", "pending"].includes(data.task_status))
    return { state: "running" };
  if (data.task_status !== "success")
    throw new YouCamError("unexpected_response");
  if (isObservation(kind)) {
    const field = { hair_type: "hair_type", hair_length: "hair_length", hair_frizz: "hair_frizziness", hair_density: "hair_density" }[kind];
    const results = z.record(z.string(), z.unknown()).parse(data.results);
    const observation = z.object({ term: z.string().min(1).max(200), mapping: z.union([z.string().max(100), z.number()]).optional() }).safeParse(results[field]);
    return observation.success
      ? { state: "success", observation: observation.data }
      : { state: "success", notice: "The service did not return this observation. Try another photo that follows the photo guide." };
  }
  if (kind === "color") {
    const result = z
      .object({
        color: z.object({
          hair_color_name: z.string().optional(),
          hair_color: z
            .string()
            .regex(/^#[0-9a-f]{6}$/i)
            .optional(),
        }),
      })
      .parse(data.results);
    if (!result.color.hair_color || !result.color.hair_color_name) {
      return {
        state: "success",
        notice:
          "Hair colour was not included in this response. Compare your original photo and reference visually.",
      };
    }
    return {
      state: "success",
      color: {
        name: result.color.hair_color_name,
        hex: result.color.hair_color,
      },
    };
  }
  const result = z
    .union([
      z.object({ url: z.string().url() }),
      z.array(z.object({ download_url: z.string().url() })).min(1),
    ])
    .parse(data.results);
  return {
    state: "success",
    url: Array.isArray(result) ? result[0].download_url : result.url,
  };
}

export function assertProviderMediaUrl(raw: string) {
  const url = new URL(raw);
  const hosts = [
    "amazonaws.com",
    "makeupar.com",
    "perfectcorp.com",
    "cloudfront.net",
  ];
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !hosts.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    )
  ) {
    throw new YouCamError("untrusted_media_url");
  }
  return url;
}

export class YouCamClient {
  constructor(
    private key: string,
    private transport: typeof fetch = fetch,
  ) {}

  private async request(path: string, body?: unknown) {
    if (!this.key) throw new YouCamError("not_configured", 503);
    let response: Response;
    try {
      response = await this.transport(`${API_ORIGIN}${path}`, {
        method: body ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(25_000),
      });
    } catch {
      throw new YouCamError("timeout", 504);
    }
    const payload = await response.json().catch(() => ({}));
    if (
      !response.ok ||
      (typeof payload.status === "number" && payload.status >= 400)
    ) {
      throw new YouCamError(
        String(payload.error_code || payload.error || "provider_error"),
        response.status === 429 ? 429 : 502,
      );
    }
    return payload;
  }

  async upload(bytes: Uint8Array, filename = "reference.jpg") {
    const payload = await this.request("/s2s/v2.0/file", {
      files: [
        {
          content_type: "image/jpeg",
          file_name: filename,
          file_size: bytes.length,
        },
      ],
    });
    const { data } = z
      .object({
        data: z.object({
          files: z
            .array(
              z.object({
                file_id: z.string(),
                requests: z
                  .array(
                    z.object({
                      method: z.literal("PUT"),
                      url: z.string().url(),
                      headers: z.record(z.string(), z.string()),
                    }),
                  )
                  .min(1),
              }),
            )
            .min(1),
        }),
      })
      .parse(payload);
    const file = data.files[0];
    const target = file.requests[0];
    assertProviderMediaUrl(target.url);
    const response = await this.transport(target.url, {
      method: "PUT",
      headers: target.headers,
      body: new Uint8Array(bytes),
      redirect: "error",
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) throw new YouCamError("upload_failed");
    return file.file_id;
  }

  async start(kind: PreviewKind, body: unknown) {
    const payload = await this.request(paths[kind], body);
    return z
      .object({ data: z.object({ task_id: z.string().min(1) }) })
      .parse(payload).data.task_id;
  }

  async templates(kind: TemplateKind, cursor?: string): Promise<TemplatePage> {
    const query = new URLSearchParams({ page_size: "20" });
    if (cursor) query.set("starting_token", cursor);
    const payload = await this.request(`${paths[kind].replace("/task/", "/task/template/")}?${query}`);
    const { data } = z.object({ data: z.object({
      templates: z.array(z.object({ id: z.string(), title: z.string(), thumb: z.string().url(), category_name: z.string().optional(), keep_users_color: z.boolean().optional() })).max(20),
      next_token: z.string().nullish(),
    }) }).parse(payload);
    return { templates: data.templates.map((template) => ({
      id: template.id, title: template.title, thumb: assertProviderMediaUrl(template.thumb).href,
      category: template.category_name ?? "", keepColor: template.keep_users_color,
    })), next: data.next_token || undefined };
  }

  async poll(kind: PreviewKind, taskId: string) {
    return parseTaskResult(
      kind,
      await this.request(`${paths[kind]}/${encodeURIComponent(taskId)}`),
    );
  }

  async download(url: string) {
    assertProviderMediaUrl(url);
    const response = await this.transport(url, {
      redirect: "error",
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok || !response.body)
      throw new YouCamError("download_failed");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 10_000_000) {
        await reader.cancel();
        throw new YouCamError("result_too_large");
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  }
}
