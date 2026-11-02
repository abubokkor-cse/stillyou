import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { YouCamError, previewErrorMessage } from "@/lib/youcam";

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError)
    return json({ error: error.message }, error.status);
  if (error instanceof YouCamError)
    return json(
      { error: previewErrorMessage(error.code), code: error.code },
      error.status,
    );
  if (error instanceof ZodError)
    return json({ error: "Please check the information and try again." }, 400);
  console.error(
    "Request failed:",
    error instanceof Error ? error.name : "UnknownError",
  );
  return json({ error: "Something went wrong. Please try again." }, 500);
}

export function sameOrigin(request: Request) {
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (request.headers.get("origin") !== expected)
    throw new AppError("Open StillYou directly to make this change.", 403);
}

export async function body(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new AppError("Expected JSON.", 415);
  const raw = await request.text();
  if (raw.length > 16_000) throw new AppError("Request is too large.", 413);
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError("Invalid request.", 400);
  }
}

export async function form(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 4_200_000)
    throw new AppError("Choose an image smaller than 4 MB.", 413);
  return request.formData();
}
