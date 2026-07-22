/**
 * Background-video constraints (ADMIN-03). Atmospheric background loops (login,
 * profile, search, 404, admin) sit behind the UI and must never hurt page
 * performance, so every admin-supplied video is validated against these limits
 * before it can be activated (ADMIN-04). Kept framework-agnostic so both the
 * runtime gate (`validate.ts`) and the CLI (`scripts/validate-video.mjs`) share
 * one source of truth.
 */
export const VIDEO_CONSTRAINTS = {
  /** Hard ceiling on file weight — background loops should be lean. */
  maxSizeBytes: 10 * 1024 * 1024, // 10 MB
  /** Loops are short; anything longer is almost certainly the wrong asset. */
  maxDurationSeconds: 60,
  /** Above this the video streams too heavily behind the UI. */
  maxBitrateKbps: 5000,
  maxWidth: 1920,
  maxHeight: 1080,
  /** Accepted containers, keyed by the normalized short name. */
  acceptedContainers: ["mp4", "webm"] as const,
  /** Accepted video codecs — H.264 (mp4) and the WebM family. */
  acceptedCodecs: ["h264", "vp9", "vp8", "av1"] as const,
} as const;

export type VideoContainer =
  (typeof VIDEO_CONSTRAINTS.acceptedContainers)[number];

/** Maps a MIME type or file extension to a normalized container name. */
export function normalizeContainer(input: string): VideoContainer | null {
  const value = input.trim().toLowerCase();
  if (
    value.includes("mp4") ||
    value.endsWith(".mp4") ||
    value === "mov,mp4,m4a,3gp,3g2,mj2"
  ) {
    return "mp4";
  }
  if (value.includes("webm") || value.endsWith(".webm")) return "webm";
  return null;
}
