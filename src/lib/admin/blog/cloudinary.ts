import "server-only";

import { createHash } from "node:crypto";

/**
 * Delivery transformation baked into every stored URL.
 *
 * Body images are rendered from sanitized HTML — a plain `<img>`, not
 * `next/image` — so Next's optimizer never sees them. `f_auto` makes Cloudinary
 * negotiate AVIF/WebP per browser and `q_auto` picks the quality, which is the
 * only way these images get modern formats at all. `c_limit,w_1600` caps a
 * phone-camera upload at article width instead of shipping a 4000px original.
 */
const DELIVERY_TRANSFORMATION = "f_auto,q_auto,c_limit,w_1600";

/** Cloudinary rejects larger free-tier image uploads; fail before the round trip. */
export const MAX_BLOG_IMAGE_BYTES = 10 * 1024 * 1024;

/** What an editor may upload. SVG is excluded — it can carry script. */
export const ALLOWED_BLOG_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

export interface UploadedBlogImage {
  /** Delivery URL with {@link DELIVERY_TRANSFORMATION} applied. */
  url: string;
  /** Cloudinary public id, so the asset can be deleted with its row. */
  publicId: string;
  /** Intrinsic size of the stored derivative, for `width`/`height` (no CLS). */
  width: number | null;
  height: number | null;
}

export class BlogImageConfigError extends Error {
  constructor() {
    super("Cloudinary blog image upload is not configured");
    this.name = "BlogImageConfigError";
  }
}

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
}

function getConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) throw new BlogImageConfigError();

  return {
    cloudName,
    apiKey,
    apiSecret,
    folder: process.env.CLOUDINARY_BLOG_FOLDER?.trim() || "minna/blog",
  };
}

function signParams(params: Record<string, string>, apiSecret: string): string {
  const payload = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

interface CloudinaryImageResponse {
  public_id?: string;
  secure_url?: string;
  version?: number;
  width?: number;
  height?: number;
  format?: string;
  error?: { message?: string };
}

/**
 * Rewrites an upload response into a delivery URL carrying the transformation.
 *
 * Built from the public id rather than string-patching `secure_url`, so the URL
 * is correct whatever shape Cloudinary returned.
 */
function deliveryUrl(
  cloudName: string,
  publicId: string,
  version: number | undefined,
  format: string | undefined,
): string {
  const versionSegment = version ? `v${version}/` : "";
  const extension = format ? `.${format}` : "";
  return `https://res.cloudinary.com/${cloudName}/image/upload/${DELIVERY_TRANSFORMATION}/${versionSegment}${publicId}${extension}`;
}

/**
 * Uploads one editor-selected image and returns its delivery URL and size.
 *
 * The public id is derived from the file name so the media library stays
 * legible in the Cloudinary console; a timestamp suffix keeps two uploads of
 * `cover.jpg` from overwriting one another.
 */
export async function uploadBlogImage(file: File): Promise<UploadedBlogImage> {
  const config = getConfig();
  const base =
    file.name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "image";
  const publicId = `${base}-${Date.now()}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const params: Record<string, string> = {
    folder: config.folder,
    public_id: publicId,
    tags: "minna,blog,admin",
    timestamp,
  };
  const uploadData = new FormData();
  uploadData.set("file", file, file.name || `${publicId}.bin`);
  for (const [key, value] of Object.entries(params)) {
    uploadData.set(key, value);
  }
  uploadData.set("api_key", config.apiKey);
  uploadData.set("signature", signParams(params, config.apiSecret));

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    { method: "POST", body: uploadData },
  );
  const result = (await response.json()) as CloudinaryImageResponse;

  if (!response.ok || !result.public_id) {
    throw new Error(result.error?.message ?? "Cloudinary upload failed");
  }

  return {
    url: deliveryUrl(
      config.cloudName,
      result.public_id,
      result.version,
      result.format,
    ),
    publicId: result.public_id,
    width: result.width ?? null,
    height: result.height ?? null,
  };
}

/**
 * Deletes an uploaded asset. Failures are reported but never block removing the
 * library row: a stranded Cloudinary file is a smaller problem than a library
 * entry pointing at something the editor already asked to be gone.
 */
export async function deleteBlogImage(publicId: string): Promise<void> {
  const config = getConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = { public_id: publicId, timestamp };

  const body = new FormData();
  for (const [key, value] of Object.entries(params)) body.set(key, value);
  body.set("api_key", config.apiKey);
  body.set("signature", signParams(params, config.apiSecret));

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`,
    { method: "POST", body },
  );

  if (!response.ok) {
    console.error("[admin] Cloudinary destroy failed for", publicId);
  }
}
