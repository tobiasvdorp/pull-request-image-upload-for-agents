import { randomUUID, timingSafeEqual } from "node:crypto";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

function hasValidBearerToken(request: Request): boolean {
  const expected = process.env.UPLOAD_TOKEN;
  if (!expected) {
    return false;
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return false;
  }

  const provided = Buffer.from(header.slice("Bearer ".length).trim());
  const expectedBuffer = Buffer.from(expected);
  if (provided.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(provided, expectedBuffer);
}

function sanitizeFilename(originalName: string): string {
  const base = originalName.replace(/^.*[/\\]/, "");
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/g, "")
    .replace(/\.+/g, ".");
  return cleaned.slice(0, 100) || "image";
}

function resolveContentType(file: File): string | null {
  if (ALLOWED_CONTENT_TYPES.has(file.type)) {
    return file.type;
  }

  if (file.type && file.type !== "application/octet-stream") {
    return null;
  }

  const extension = sanitizeFilename(file.name).split(".").pop()?.toLowerCase();
  const inferred = extension ? CONTENT_TYPE_BY_EXTENSION[extension] : undefined;
  return inferred ?? null;
}

export async function POST(request: Request) {
  if (!hasValidBearerToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart form data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }

  const contentType = resolveContentType(file);
  if (!contentType) {
    return NextResponse.json(
      { error: "Unsupported file type" },
      { status: 415 },
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File exceeds 10 MB limit" },
      { status: 413 },
    );
  }

  const pathname = `pr-images/${randomUUID()}-${sanitizeFilename(file.name)}`;

  try {
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
      contentType,
    });

    return NextResponse.json({ url: blob.url });
  } catch {
    console.error("Blob upload failed");
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
