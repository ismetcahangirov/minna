"use client";

import { Avatar } from "@base-ui/react/avatar";
import { Pencil } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { updateProfile, type UpdateProfileState } from "@/lib/user/actions";

/** The account fields the profile header displays and edits (PROFILE-01). */
export interface ProfileInfoData {
  name: string;
  email: string;
  image: string | null;
  role: "user" | "admin";
  /** ISO join date; null when the DB row couldn't be read (hides the line). */
  createdAt: string | null;
}

const NAME_MAX = 60;
const INITIAL_STATE: UpdateProfileState = { status: "idle" };

function initials(name: string, email: string): string {
  const source = name.trim() || email.trim();
  if (!source) return "U";
  const parts = source.split(/\s+/);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : source[0];
  return letters.toUpperCase();
}

const inputClass =
  "bg-surface border-border text-foreground focus-visible:ring-ring w-full border px-3 py-2 text-sm outline-none focus-visible:ring-2";

/**
 * Profile header (PROFILE-01): the avatar, name and email, plus an inline
 * editor for the display name (email is the Google identity, avatar comes from
 * Google — neither is user-editable). Submits the {@link updateProfile} server
 * action through `useActionState`; on success the server revalidates `/profile`
 * so the (server-read) name updates and the editor collapses. State is adjusted
 * in render (no `setState` in effects — an ESLint hard error in this repo).
 */
export function ProfileInfo({ profile }: { profile: ProfileInfoData }) {
  const t = useTranslations("profile");
  const format = useFormatter();
  const [state, formAction, pending] = useActionState(
    updateProfile,
    INITIAL_STATE,
  );
  const [editing, setEditing] = useState(false);
  const [seenState, setSeenState] = useState(state);

  // Collapse the editor once a save succeeds (render-phase adjust-on-change).
  if (state !== seenState) {
    setSeenState(state);
    if (state.status === "success") setEditing(false);
  }

  const memberSince = profile.createdAt
    ? format.dateTime(new Date(profile.createdAt), {
        year: "numeric",
        month: "long",
      })
    : null;
  const roleLabel = profile.role === "admin" ? t("roleAdmin") : t("roleUser");

  return (
    <section className="border-border bg-surface/80 flex flex-col gap-6 border p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
      <Avatar.Root className="bg-secondary text-secondary-foreground border-border mx-auto inline-flex size-24 shrink-0 items-center justify-center overflow-hidden border text-2xl font-bold select-none sm:mx-0">
        {profile.image && (
          <Avatar.Image
            src={profile.image}
            alt={profile.name}
            className="size-full object-cover"
          />
        )}
        <Avatar.Fallback className="flex size-full items-center justify-center">
          {initials(profile.name, profile.email)}
        </Avatar.Fallback>
      </Avatar.Root>

      <div className="min-w-0 flex-1">
        {editing ? (
          <form action={formAction} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {t("displayName")}
              </span>
              <input
                name="name"
                type="text"
                defaultValue={profile.name}
                maxLength={NAME_MAX}
                required
                autoFocus
                disabled={pending}
                placeholder={t("namePlaceholder")}
                className={inputClass}
              />
            </label>
            {state.status === "error" && state.error && (
              <p className="text-primary text-sm" role="alert">
                {t(
                  state.error === "empty"
                    ? "errorEmpty"
                    : state.error === "tooLong"
                      ? "errorTooLong"
                      : state.error === "unauthorized"
                        ? "errorUnauthorized"
                        : "errorFailed",
                )}
              </p>
            )}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={pending}>
                {pending ? t("saving") : t("save")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setEditing(false)}
              >
                {t("cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-1 text-center sm:text-left">
            <div className="flex items-center justify-center gap-3 sm:justify-start">
              <h2 className="text-foreground truncate text-2xl font-extrabold tracking-tight">
                {profile.name}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("edit")}
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-4" aria-hidden />
              </Button>
            </div>
            <p className="text-muted-foreground truncate text-sm">
              {profile.email}
            </p>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs sm:justify-start">
              <span className="border-border text-foreground border px-2 py-0.5 font-medium">
                {roleLabel}
              </span>
              {memberSince && (
                <span>{t("memberSince", { date: memberSince })}</span>
              )}
            </div>
            {state.status === "success" && (
              <p className="text-muted-foreground mt-1 text-xs" role="status">
                {t("saved")}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
