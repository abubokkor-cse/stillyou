import { describe, expect, it, vi } from "vitest";
import {
  YouCamClient,
  YouCamError,
  assertProviderMediaUrl,
  buildTaskBody,
  parseTaskResult,
} from "../src/lib/youcam";

describe("YouCam requests", () => {
  it("keeps the wig reference colour and rejects missing references", () => {
    expect(buildTaskBody("hair", "source", { referenceId: "wig" })).toEqual({
      src_file_id: "source",
      ref_file_id: "wig",
      hair_color: "ref",
    });
    expect(() => buildTaskBody("hair", "source", {})).toThrow(
      "missing_reference",
    );
  });

  it("explicitly disables both default smoothing controls for brow previews", () => {
    const body = buildTaskBody("brows", "source", { browColor: "#574237" });
    expect(body).toMatchObject({
      src_file_id: "source",
      effects: [
        {
          category: "skin_smooth",
          skinSmoothStrength: 0,
          skinSmoothColorIntensity: 0,
        },
        {
          category: "eyebrows",
          pattern: { type: "color" },
          palettes: [{ color: "#574237", texture: "matte" }],
        },
      ],
    });
    expect(() =>
      buildTaskBody("brows", "source", { browColor: "invalid" }),
    ).toThrow();
  });

  it("sends authentication only to the API, never to a signed upload URL", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          data: {
            files: [
              {
                file_id: "file-1",
                requests: [
                  {
                    method: "PUT",
                    url: "https://yce-us.s3-accelerate.amazonaws.com/image.jpg",
                    headers: { "Content-Type": "image/jpeg" },
                  },
                ],
              },
            ],
          },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const client = new YouCamClient("test-only-key", transport);
    await expect(client.upload(new Uint8Array([1, 2, 3]))).resolves.toBe(
      "file-1",
    );
    expect(transport.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: "Bearer test-only-key",
    });
    expect(transport.mock.calls[1][1]?.headers).not.toHaveProperty(
      "Authorization",
    );
    expect(transport.mock.calls[1][1]?.redirect).toBe("error");
  });

  it("does not retry a billed generation request after a transport failure", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("connection reset"));
    await expect(
      new YouCamClient("test-only-key", transport).start("hair", {}),
    ).rejects.toBeInstanceOf(YouCamError);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("rejects an unconfigured integration before making a request", async () => {
    const transport = vi.fn<typeof fetch>();
    await expect(
      new YouCamClient("", transport).start("hair", {}),
    ).rejects.toThrow("not_configured");
    expect(transport).not.toHaveBeenCalled();
  });
});

describe("provider responses", () => {
  it("keeps a successful analysis without hair fields as unavailable instead of inventing a colour", () => {
    expect(
      parseTaskResult("color", {
        data: {
          task_status: "success",
          results: {
            color: { skin_color: "#ba9478", eye_color_name: "Brown" },
          },
        },
      }),
    ).toMatchObject({
      state: "success",
      notice: expect.stringContaining("not included"),
    });
  });
  it("preserves a real short-hair error without inventing a result", () => {
    expect(
      parseTaskResult("hair", {
        data: { task_status: "error", error: "error_hair_too_short" },
      }),
    ).toEqual({ state: "error", error: "error_hair_too_short" });
  });

  it("reads both documented makeup result shapes", () => {
    for (const results of [
      { url: "https://example.com/result.jpg" },
      [{ download_url: "https://example.com/result.jpg" }],
    ]) {
      expect(
        parseTaskResult("brows", { data: { task_status: "success", results } }),
      ).toEqual({ state: "success", url: "https://example.com/result.jpg" });
    }
  });

  it("returns a broad colour family and no fabricated match score", () => {
    expect(
      parseTaskResult("color", {
        data: {
          task_status: "success",
          results: {
            color: { hair_color_name: "Brown", hair_color: "#42280E" },
          },
        },
      }),
    ).toEqual({ state: "success", color: { name: "Brown", hex: "#42280E" } });
  });

  it("rejects malformed success payloads and unknown statuses", () => {
    expect(() =>
      parseTaskResult("hair", {
        data: { task_status: "success", results: {} },
      }),
    ).toThrow();
    expect(() =>
      parseTaskResult("hair", { data: { task_status: "mystery" } }),
    ).toThrow();
    expect(
      parseTaskResult("hair", { data: { task_status: "queued" } }),
    ).toEqual({ state: "running" });
  });

  it("rejects private, credentialed, redirected and lookalike media hosts", () => {
    for (const url of [
      "http://localhost/image.jpg",
      "https://127.0.0.1/image.jpg",
      "https://amazonaws.com.evil.example/image.jpg",
      "https://evilamazonaws.com/image.jpg",
      "https://user:password@yce-us.s3.amazonaws.com/image.jpg",
      "https://yce-us.s3.amazonaws.com:8443/image.jpg",
    ]) {
      expect(() => assertProviderMediaUrl(url)).toThrow();
    }
    expect(
      assertProviderMediaUrl(
        "https://yce-us.s3-accelerate.amazonaws.com/image.jpg",
      ).protocol,
    ).toBe("https:");
  });
});
