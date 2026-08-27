#!/usr/bin/env node
/**
 * Writes a base64 payload from stdin to a binary file.
 *
 * The bridge between a browser and the disk. An image that only exists inside
 * an authenticated page (a ChatGPT generation, a signed CDN URL) is read in the
 * page's own context with `fetch` + `btoa`, handed back as base64, and landed
 * here — no download directory, no cookie juggling, no CORS proxy.
 *
 * Usage:
 *   node save-base64.mjs <output-path> < payload.b64
 *
 * Prints the byte count so a truncated transfer is visible immediately.
 */

import { writeFile } from "node:fs/promises";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

const [output] = process.argv.slice(2);
if (!output) {
  console.error("usage: node save-base64.mjs <output-path> < payload.b64");
  process.exit(2);
}

// Tolerates a `data:image/png;base64,` prefix and any wrapping whitespace.
const raw = (await readStdin()).trim().replace(/^data:[^,]*,/, "");
const bytes = Buffer.from(raw, "base64");

if (bytes.length === 0) {
  console.error("empty payload — the page returned no image data");
  process.exit(1);
}

await writeFile(output, bytes);
console.log(JSON.stringify({ path: output, bytes: bytes.length }));
