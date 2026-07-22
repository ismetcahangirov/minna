"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ads } from "@/db/schema";
import { invalidateAdPool } from "@/lib/ads/queries";
import { requireAdmin } from "@/lib/auth/admin";

/** Field keys that can carry a validation error, mapped to i18n error keys. */
type AdField =
  | "title"
  | "videoUrl"
  | "targetUrl"
  | "durationSeconds"
  | "skipAfterSeconds"
  | "weight";

/**
 * Return shape for `useActionState` on the ad form. `error`/`fieldErrors` values
 * are i18n keys (resolved under `admin.ads.errors` on the client) so the server
 * stays locale-agnostic.
 */
export interface AdFormState {
  error?: string;
  fieldErrors?: Partial<Record<AdField, string>>;
}

interface AdValues {
  title: string;
  videoUrl: string;
  targetUrl: string | null;
  durationSeconds: number | null;
  skipAfterSeconds: number;
  weight: number;
  active: boolean;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Parses a bounded non-negative integer from a form field, or `null`. */
function parseInteger(raw: string): number | null {
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : NaN;
}

/**
 * Validates and normalizes the ad form. Returns either the clean values or a
 * `fieldErrors` map — the single source of truth for both create and update.
 */
function parseAd(
  formData: FormData,
): { values: AdValues } | { fieldErrors: AdFormState["fieldErrors"] } {
  const fieldErrors: NonNullable<AdFormState["fieldErrors"]> = {};

  const title = String(formData.get("title") ?? "").trim();
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const targetUrlRaw = String(formData.get("targetUrl") ?? "").trim();
  const durationRaw = String(formData.get("durationSeconds") ?? "").trim();
  const skipRaw = String(formData.get("skipAfterSeconds") ?? "").trim();
  const weightRaw = String(formData.get("weight") ?? "").trim();
  const active = formData.get("active") != null;

  if (!title || title.length > 200) fieldErrors.title = "required";
  if (!videoUrl || !isHttpUrl(videoUrl)) fieldErrors.videoUrl = "invalidUrl";
  if (targetUrlRaw && !isHttpUrl(targetUrlRaw))
    fieldErrors.targetUrl = "invalidUrl";

  const duration = parseInteger(durationRaw);
  if (
    duration !== null &&
    (Number.isNaN(duration) || duration < 1 || duration > 3600)
  )
    fieldErrors.durationSeconds = "invalidNumber";

  const skip = parseInteger(skipRaw);
  const skipAfterSeconds = skip ?? 5;
  if (skip !== null && (Number.isNaN(skip) || skip < 0 || skip > 600))
    fieldErrors.skipAfterSeconds = "invalidNumber";

  const weightParsed = parseInteger(weightRaw);
  const weight = weightParsed ?? 1;
  if (
    weightParsed !== null &&
    (Number.isNaN(weightParsed) || weightParsed < 1 || weightParsed > 1000)
  )
    fieldErrors.weight = "invalidNumber";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  return {
    values: {
      title,
      videoUrl,
      targetUrl: targetUrlRaw || null,
      durationSeconds: duration,
      skipAfterSeconds,
      weight,
      active,
    },
  };
}

/** Creates an ad (ADMIN-02), then returns to the list. */
export async function createAdAction(
  _prev: AdFormState,
  formData: FormData,
): Promise<AdFormState> {
  await requireAdmin();

  const parsed = parseAd(formData);
  if ("fieldErrors" in parsed) return { fieldErrors: parsed.fieldErrors };

  try {
    const { db } = await import("@/db");
    await db.insert(ads).values(parsed.values);
  } catch (error) {
    console.error("[admin] createAd failed:", (error as Error).message);
    return { error: "saveFailed" };
  }

  await invalidateAdPool();
  revalidatePath("/admin/ads");
  redirect("/admin/ads");
}

/** Updates an existing ad (id bound by the edit page), then returns to the list. */
export async function updateAdAction(
  id: string,
  _prev: AdFormState,
  formData: FormData,
): Promise<AdFormState> {
  await requireAdmin();

  const parsed = parseAd(formData);
  if ("fieldErrors" in parsed) return { fieldErrors: parsed.fieldErrors };

  try {
    const { db } = await import("@/db");
    await db.update(ads).set(parsed.values).where(eq(ads.id, id));
  } catch (error) {
    console.error("[admin] updateAd failed:", (error as Error).message);
    return { error: "saveFailed" };
  }

  await invalidateAdPool();
  revalidatePath("/admin/ads");
  redirect("/admin/ads");
}

/** Deletes an ad (id bound per row). */
export async function deleteAdAction(id: string): Promise<void> {
  await requireAdmin();

  try {
    const { db } = await import("@/db");
    await db.delete(ads).where(eq(ads.id, id));
  } catch (error) {
    console.error("[admin] deleteAd failed:", (error as Error).message);
  }

  await invalidateAdPool();
  revalidatePath("/admin/ads");
}

/** Toggles an ad's active state inline from the list (id/next bound per row). */
export async function setAdActiveAction(
  id: string,
  active: boolean,
): Promise<void> {
  await requireAdmin();

  try {
    const { db } = await import("@/db");
    await db.update(ads).set({ active }).where(eq(ads.id, id));
  } catch (error) {
    console.error("[admin] setAdActive failed:", (error as Error).message);
  }

  await invalidateAdPool();
  revalidatePath("/admin/ads");
}
