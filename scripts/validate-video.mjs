#!/usr/bin/env node
// @ts-check
/**
 * Background-video validation CLI (ADMIN-03).
 *
 * Validates a candidate atmospheric background video (login / profile / search /
 * 404 / admin) against the platform's performance constraints so a heavy or
 * wrong-format asset never ships. Accepts a URL or a local file path.
 *
 *   node scripts/validate-video.mjs <url-or-path>
 *   npm run validate:video -- <url-or-path>
 *
 * When `ffprobe` (FFmpeg) is on PATH it performs the full check — container,
 * codec, size, bitrate, dimensions and duration. Without it, the deep checks are
 * skipped with a warning and only container + size are enforced (the same subset
 * the runtime gate checks). Exits non-zero when validation fails.
 *
 * NOTE: keep these limits in sync with src/lib/admin/video/constraints.ts.
 */
import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { extname } from "node:path";

const LIMITS = {
  maxSizeBytes: 10 * 1024 * 1024,
  maxDurationSeconds: 60,
  maxBitrateKbps: 5000,
  maxWidth: 1920,
  maxHeight: 1080,
  acceptedContainers: ["mp4", "webm"],
  acceptedCodecs: ["h264", "vp9", "vp8", "av1"],
};

function normalizeContainer(input) {
  const value = String(input ?? "")
    .trim()
    .toLowerCase();
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

function isUrl(input) {
  return /^https?:\/\//i.test(input);
}

async function probeHead(target) {
  if (isUrl(target)) {
    const res = await fetch(target, { method: "HEAD", redirect: "follow" });
    if (!res.ok) throw new Error(`HEAD ${target} → ${res.status}`);
    const contentLength = res.headers.get("content-length");
    return {
      container:
        normalizeContainer(res.headers.get("content-type")) ??
        normalizeContainer(new URL(target).pathname),
      sizeBytes: contentLength ? Number(contentLength) : null,
    };
  }
  const info = await stat(target);
  return {
    container: normalizeContainer(extname(target)),
    sizeBytes: info.size,
  };
}

function runFfprobe(target) {
  return new Promise((resolve) => {
    const args = [
      "-v",
      "error",
      "-show_format",
      "-show_streams",
      "-of",
      "json",
      target,
    ];
    let stdout = "";
    let child;
    try {
      child = spawn("ffprobe", args);
    } catch {
      resolve(null);
      return;
    }
    child.on("error", () => resolve(null)); // ffprobe not installed
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.on("close", (code) => {
      if (code !== 0) return resolve(null);
      try {
        const data = JSON.parse(stdout);
        const video = (data.streams ?? []).find(
          (s) => s.codec_type === "video",
        );
        resolve({
          codec: video?.codec_name ?? null,
          width: video?.width ?? null,
          height: video?.height ?? null,
          durationSeconds: data.format?.duration
            ? Math.round(Number(data.format.duration))
            : null,
          bitrateKbps: data.format?.bit_rate
            ? Math.round(Number(data.format.bit_rate) / 1000)
            : null,
        });
      } catch {
        resolve(null);
      }
    });
  });
}

function validate(probe) {
  const errors = [];
  if (
    probe.container == null ||
    !LIMITS.acceptedContainers.includes(probe.container)
  )
    errors.push(
      `Unsupported or unrecognized container: ${probe.container ?? "unknown"}`,
    );
  if (
    probe.codec != null &&
    !LIMITS.acceptedCodecs.includes(String(probe.codec).toLowerCase())
  )
    errors.push(`Unsupported codec: ${probe.codec}`);
  if (probe.sizeBytes != null && probe.sizeBytes > LIMITS.maxSizeBytes)
    errors.push(
      `Too large: ${(probe.sizeBytes / 1024 / 1024).toFixed(1)} MB > ${LIMITS.maxSizeBytes / 1024 / 1024} MB`,
    );
  if (probe.bitrateKbps != null && probe.bitrateKbps > LIMITS.maxBitrateKbps)
    errors.push(
      `Bitrate too high: ${probe.bitrateKbps} kbps > ${LIMITS.maxBitrateKbps} kbps`,
    );
  if (
    (probe.width != null && probe.width > LIMITS.maxWidth) ||
    (probe.height != null && probe.height > LIMITS.maxHeight)
  )
    errors.push(
      `Dimensions too large: ${probe.width}x${probe.height} > ${LIMITS.maxWidth}x${LIMITS.maxHeight}`,
    );
  if (
    probe.durationSeconds != null &&
    probe.durationSeconds > LIMITS.maxDurationSeconds
  )
    errors.push(
      `Too long: ${probe.durationSeconds}s > ${LIMITS.maxDurationSeconds}s`,
    );
  return errors;
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node scripts/validate-video.mjs <url-or-path>");
    process.exit(2);
  }

  let head;
  try {
    head = await probeHead(target);
  } catch (error) {
    console.error(`✗ Unreachable: ${error.message}`);
    process.exit(1);
  }

  const deep = await runFfprobe(target);
  if (!deep) {
    console.warn(
      "! ffprobe not available — skipping codec/bitrate/dimension/duration checks.",
    );
  }

  const probe = { ...head, ...(deep ?? {}) };
  console.log("Probe:", JSON.stringify(probe));

  const errors = validate(probe);
  if (errors.length > 0) {
    console.error("✗ Validation failed:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("✓ Video passes background-video constraints.");
}

main();
