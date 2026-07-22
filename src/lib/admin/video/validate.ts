import "server-only";

import {
  VIDEO_CONSTRAINTS,
  normalizeContainer,
  type VideoContainer,
} from "@/lib/admin/video/constraints";

/** Everything we might know about a candidate video. Fields are optional so a
 * cheap HEAD probe (container + size only) and a full ffprobe pass share the
 * same validator. */
export interface VideoProbe {
  container?: VideoContainer | null;
  codec?: string | null;
  sizeBytes?: number | null;
  bitrateKbps?: number | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
}

/** Validation failure codes — resolved to localized messages by the UI that
 * calls the gate (ADMIN-04, `admin.video.errors.*`). */
export type VideoValidationCode =
  | "unreachable"
  | "unsupportedContainer"
  | "unsupportedCodec"
  | "tooLarge"
  | "bitrateTooHigh"
  | "dimensionsTooLarge"
  | "tooLong";

export interface VideoValidationResult {
  ok: boolean;
  errors: VideoValidationCode[];
  probe: VideoProbe;
}

/**
 * Validates a probed video against the background-video constraints. Only fields
 * that are actually known are checked — a HEAD-only probe can enforce the
 * performance-critical container and size limits, while codec/bitrate/dimension
 * checks apply when a deep probe (ffprobe, via the CLI) supplied them.
 */
export function validateVideoProbe(probe: VideoProbe): VideoValidationResult {
  const errors: VideoValidationCode[] = [];

  if (
    probe.container != null &&
    !VIDEO_CONSTRAINTS.acceptedContainers.includes(probe.container)
  ) {
    errors.push("unsupportedContainer");
  }
  if (
    probe.codec != null &&
    !VIDEO_CONSTRAINTS.acceptedCodecs.includes(
      probe.codec.toLowerCase() as (typeof VIDEO_CONSTRAINTS.acceptedCodecs)[number],
    )
  ) {
    errors.push("unsupportedCodec");
  }
  if (
    probe.sizeBytes != null &&
    probe.sizeBytes > VIDEO_CONSTRAINTS.maxSizeBytes
  ) {
    errors.push("tooLarge");
  }
  if (
    probe.bitrateKbps != null &&
    probe.bitrateKbps > VIDEO_CONSTRAINTS.maxBitrateKbps
  ) {
    errors.push("bitrateTooHigh");
  }
  if (
    (probe.width != null && probe.width > VIDEO_CONSTRAINTS.maxWidth) ||
    (probe.height != null && probe.height > VIDEO_CONSTRAINTS.maxHeight)
  ) {
    errors.push("dimensionsTooLarge");
  }
  if (
    probe.durationSeconds != null &&
    probe.durationSeconds > VIDEO_CONSTRAINTS.maxDurationSeconds
  ) {
    errors.push("tooLong");
  }

  return { ok: errors.length === 0, errors, probe };
}

/** Reads the container and size a server can learn from a HEAD request. */
async function headProbe(url: string): Promise<VideoProbe | null> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    const contentLength = res.headers.get("content-length");
    const pathname = (() => {
      try {
        return new URL(url).pathname;
      } catch {
        return url;
      }
    })();

    return {
      container:
        normalizeContainer(contentType) ?? normalizeContainer(pathname),
      sizeBytes: contentLength ? Number(contentLength) : null,
    };
  } catch {
    return null;
  }
}

/**
 * Runtime gate used before a background video is activated (ADMIN-04). Probes
 * the URL with a HEAD request and validates the container and size — the checks
 * that are both cheap and performance-critical. Deep codec/bitrate/dimension
 * validation is the CLI's job (`scripts/validate-video.mjs`, ffprobe). An
 * unreachable URL fails closed so a broken asset can never be activated.
 */
export async function validateBackgroundVideoUrl(
  url: string,
): Promise<VideoValidationResult> {
  const probe = await headProbe(url);
  if (!probe) {
    return { ok: false, errors: ["unreachable"], probe: {} };
  }
  if (probe.container == null) {
    return { ok: false, errors: ["unsupportedContainer"], probe };
  }
  return validateVideoProbe(probe);
}
