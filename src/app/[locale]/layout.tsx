import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import "../globals.css";

import { WebAnalytics } from "@/components/analytics/web-analytics";
import { WebVitals } from "@/components/analytics/web-vitals";
import { SiteHeader } from "@/components/header";
import { HeaderGate } from "@/components/header/header-gate";
import { JsonLd } from "@/components/seo/json-ld";
import { openGraphLocales } from "@/i18n/config";
import { resolveLocale, type LocaleRouteProps } from "@/i18n/route-locale";
import { localeAlternates } from "@/lib/seo/locale-alternates";
import { getSiteUrlObject } from "@/lib/seo/site";
import { buildSiteJsonLd } from "@/lib/seo/site-jsonld";
import { StoreProvider } from "@/store/provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type LocaleLayoutProps = LocaleRouteProps & { children: React.ReactNode };

/*
 * Deliberately no `generateStaticParams` for the locale segment.
 *
 * next-intl suggests it to enable static rendering, but nothing under this
 * layout is statically renderable: every page reads the session, the Redis-
 * cached catalogue or Neon. Declaring the params only makes the build attempt a
 * prerender of each route in each locale, which fires live AniList/Kitsu
 * requests at build time — the same failure mode `sitemap.ts` is marked
 * `force-dynamic` to avoid, where a deploy fails because an upstream API
 * happened to be down while it built.
 *
 * `setRequestLocale` below is still called, so the day a page does become
 * static this is one line to add back.
 */

export async function generateMetadata({
  params,
}: LocaleLayoutProps): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "home.hero" });
  const description = t("tagline");

  return {
    // Resolves every page's relative `canonical`/`openGraph` URLs to absolute
    // ones (PERF-01). Without it, canonical tags and OG images stay relative
    // and are ignored by crawlers and social scrapers.
    metadataBase: getSiteUrlObject(),
    // A plain string (not a title template): every child page already appends
    // " — Minna" to its own title, so a `%s — Minna` template would produce a
    // double suffix. This value only covers pages without their own title.
    title: "Minna — Watch Anime Online",
    description,
    applicationName: "Minna",
    alternates: localeAlternates("/", locale),
    openGraph: {
      type: "website",
      siteName: "Minna",
      locale: openGraphLocales[locale],
      title: "Minna — Watch Anime Online",
      description,
      url: localeAlternates("/", locale).canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: "Minna — Watch Anime Online",
      description,
    },
    verification: {
      google: "r2Z9CII6sLiZcDu8WO5InBtVXyLJPDet3UoB-jqwVbY",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const locale = await resolveLocale(params);

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <JsonLd data={buildSiteJsonLd()} />
        <WebVitals />
        <WebAnalytics />
        <NextIntlClientProvider>
          <StoreProvider>
            <HeaderGate>
              <SiteHeader />
            </HeaderGate>
            {children}
          </StoreProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
