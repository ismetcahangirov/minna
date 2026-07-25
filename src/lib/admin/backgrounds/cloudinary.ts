import "server-only";

import { createHash } from "node:crypto";

import type {
  BackgroundPage,
  BackgroundVariant,
} from "@/lib/backgrounds/config";

const ANIMATED_WEBP_TRANSFORMATION =
  "e_loop,f_webp,fl_animated,fl_awebp,q_auto";

type SignableParams = Record<string, string>;

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
}

interface CloudinaryEagerAsset {
  format?: string;
  secure_url?: string;
  transformation?: string;
}

interface CloudinaryUploadResponse {
  public_id?: string;
  secure_url?: string;
  version?: number;
  eager?: CloudinaryEagerAsset[];
  error?: { message?: string };
}

export class CloudinaryConfigError extends Error {
  constructor() {
    super("Cloudinary background upload is not configured");
    this.name = "CloudinaryConfigError";
  }
}

function getConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new CloudinaryConfigError();
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
    folder:
      process.env.CLOUDINARY_BACKGROUND_FOLDER?.trim() || "minna/bg/admin",
  };
}

function signParams(params: SignableParams, apiSecret: string): string {
  const payload = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

function publicIdFor(page: BackgroundPage, variant: BackgroundVariant): string {
  return `${page}-${variant}-${Date.now()}`;
}

function fallbackWebpUrl(
  cloudName: string,
  publicId: string,
  version?: number,
): string {
  const versionSegment = version ? `v${version}/` : "";
  return `https://res.cloudinary.com/${cloudName}/video/upload/${ANIMATED_WEBP_TRANSFORMATION}/${versionSegment}${publicId}.webp`;
}

function pickWebpUrl(
  response: CloudinaryUploadResponse,
  cloudName: string,
): string | null {
  const eager = response.eager?.find((asset) => {
    const url = asset.secure_url ?? "";
    return (
      asset.format === "webp" ||
      asset.transformation?.includes("f_webp") === true ||
      url.includes("f_webp")
    );
  });

  if (eager?.secure_url) return eager.secure_url;
  if (!response.public_id) return null;

  return fallbackWebpUrl(cloudName, response.public_id, response.version);
}

/**
 * Uploads an admin-selected video and returns the Cloudinary animated WebP
 * derivative URL. The original stays in Cloudinary, but the app only stores and
 * renders the WebP transform so the public pages use the optimized asset.
 */
export async function uploadBackgroundVideoAsWebp(
  file: File,
  page: BackgroundPage,
  variant: BackgroundVariant,
): Promise<string> {
  const config = getConfig();
  const publicId = publicIdFor(page, variant);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params: SignableParams = {
    eager: ANIMATED_WEBP_TRANSFORMATION,
    eager_async: "false",
    folder: config.folder,
    overwrite: "true",
    public_id: publicId,
    tags: "minna,background,admin",
    timestamp,
  };
  const signature = signParams(params, config.apiSecret);
  const uploadData = new FormData();

  uploadData.set("file", file, file.name || `${publicId}.video`);
  for (const [key, value] of Object.entries(params)) {
    uploadData.set(key, value);
  }
  uploadData.set("api_key", config.apiKey);
  uploadData.set("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/video/upload`,
    { method: "POST", body: uploadData },
  );
  const result = (await response.json()) as CloudinaryUploadResponse;

  if (!response.ok) {
    throw new Error(result.error?.message ?? "Cloudinary upload failed");
  }

  const webpUrl = pickWebpUrl(result, config.cloudName);
  if (!webpUrl) throw new Error("Cloudinary did not return a WebP URL");

  return webpUrl;
}
