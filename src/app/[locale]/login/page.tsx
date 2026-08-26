import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { GoogleIcon } from "@/components/auth/google-icon";
import { LoginBackground } from "@/components/auth/login-background";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { resolveLocale, type LocaleRouteProps } from "@/i18n/route-locale";
import { signInWithGoogleTo } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { localeCanonical } from "@/lib/seo/locale-alternates";

export async function generateMetadata({
  params,
}: LocaleRouteProps): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "login" });
  return {
    title: `${t("title")} — Minna`,
    description: t("subtitle"),
    // Thin auth-only page — keep it out of the index but let links be followed.
    robots: { index: false, follow: true },
    alternates: localeCanonical("/login", locale),
  };
}

interface LoginPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}

/**
 * Only same-origin, path-relative callback URLs are honoured (the server action
 * re-validates too); anything else falls back to home. Prevents the login link
 * from being turned into an open redirect via a crafted `?callbackUrl=`.
 */
function safeCallbackUrl(
  raw: string | string[] | undefined,
  locale: Locale,
): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const fallback = localePath("/", locale);
  if (!value || !value.startsWith("/") || value.startsWith("//"))
    return fallback;
  if (value.includes("\\")) return fallback;
  return value;
}

/**
 * Login page (EPIC-10). Google is the only sign-in method (CLAUDE.md), so the
 * page is a single "Continue with Google" call-to-action over the atmospheric
 * slate background (LOGIN-02). Signed-in users are bounced straight to their
 * destination. The `?callbackUrl=` set by the route proxy (src/proxy.ts) is
 * carried through the OAuth round-trip so the user lands back where they came
 * from.
 */
export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "login" });
  const { callbackUrl } = await searchParams;
  const target = safeCallbackUrl(callbackUrl, locale);

  // Already signed in — no reason to show the login form.
  const user = await getCurrentUser();
  // Deliberately Next's own `redirect`, not the locale-aware one: `callbackUrl`
  // is written by the proxy from the request path, so it already carries the
  // locale prefix. Re-prefixing it would produce `/tr/tr/library`.
  if (user?.id) redirect(target);

  return (
    <>
      <LoginBackground />
      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-24 sm:py-28">
        <section className="border-border bg-surface/80 w-full max-w-sm border p-8">
          <header className="flex flex-col items-center gap-2 text-center">
            <span className="text-primary text-2xl font-extrabold tracking-tight">
              MINNA
            </span>
            <h1 className="text-foreground text-xl font-bold tracking-tight">
              {t("heading")}
            </h1>
            <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
          </header>

          <form action={signInWithGoogleTo} className="mt-8">
            <input type="hidden" name="callbackUrl" value={target} />
            <Button
              type="submit"
              variant="outline"
              size="lg"
              className="h-11 w-full gap-3 text-sm font-medium"
            >
              <GoogleIcon className="size-5" />
              {t("continueWithGoogle")}
            </Button>
          </form>

          <p className="text-muted-foreground/80 mt-6 text-center text-xs">
            {t("googleOnly")}
          </p>
        </section>

        <p className="text-muted-foreground/60 mt-6 max-w-sm text-center text-xs">
          {t("terms")}
        </p>
      </main>
    </>
  );
}
