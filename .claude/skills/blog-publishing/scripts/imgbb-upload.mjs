#!/usr/bin/env node
/**
 * Uploads an image to imgbb and prints the permanent i.ibb.co URL.
 *
 * The blog stores image URLs, never image bytes — a cover or a body figure is
 * whatever host the URL points at. imgbb is that host: free, permanent by
 * default, and it answers with a direct-file URL that both `next/image` (cover)
 * and the sanitized `<img>` in the body can use.
 *
 * Usage:
 *   node imgbb-upload.mjs <file-or-url> [name]
 *
 * Prints one line of JSON: {"url","width","height","deleteUrl"}
 *
 * `name` becomes the filename in the URL, so it is an SEO surface: pass the
 * keyword slug ("top-10-anime-2026-cover"), never "image1".
 */

import { readFile } from "node:fs/promises";
import { basename } from "node:path";

// Account key for this project. Kept here so no one has to paste it per call.
const API_KEY = process.env.IMGBB_API_KEY ?? "9cb3d752d612361b5912ce2eea8c6297";

const ENDPOINT = "https://api.imgbb.com/1/upload";

/** imgbb accepts a remote URL verbatim; anything else is sent as base64. */
async function payload(source) {
  if (/^https?:\/\//i.test(source)) return source;
  const bytes = await readFile(source);
  return bytes.toString("base64");
}

/** A slug imgbb will accept as the stored filename. */
function slugify(value) {
  return (
    value
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "image"
  );
}

async function main() {
  const [source, rawName] = process.argv.slice(2);
  if (!source) {
    console.error("usage: node imgbb-upload.mjs <file-or-url> [name]");
    process.exit(2);
  }

  const name = slugify(rawName ?? basename(source));
  const body = new URLSearchParams({ image: await payload(source), name });

  const response = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: "POST",
    body,
  });
  const json = await response.json();

  if (!json?.success) {
    console.error(
      `imgbb rejected the upload: ${json?.error?.message ?? response.status}`,
    );
    process.exit(1);
  }

  const { url, width, height, delete_url: deleteUrl } = json.data;
  console.log(JSON.stringify({ url, width, height, deleteUrl }));
}

await main();
