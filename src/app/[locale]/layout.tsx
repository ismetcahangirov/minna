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
import { locales, openGraphLocales } from "@/i18n/config";
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

/** HilltopAds site-verification token — the meta tag's name *and* content. */
const HILLTOPADS_VERIFICATION = "1a252ba84f266313738b4201f7d790b135aaf08a";

/** Bing Webmaster Tools site-verification token (`msvalidate.01`). */
const BING_VERIFICATION = "54DEDFDF0D0CB5F35DBA7704B575A176";

type LocaleLayoutProps = LocaleRouteProps & { children: React.ReactNode };

/**
 * Enumerates the locale segment, which is what makes any page below this layout
 * eligible to be rendered once and cached rather than per request.
 *
 * This used to be omitted on the grounds that nothing under the layout was
 * statically renderable anyway — every page read the session, the Redis-cached
 * catalogue or Neon. Only the first of those actually forces dynamic rendering,
 * and it did so because *this layout's* header read the session, which made the
 * claim self-fulfilling for all three locales at once. With that read moved into
 * the browser, the pages that carry a `revalidate` can be served from the edge,
 * and a page without one is still detected as dynamic and rendered per request
 * exactly as before. Nothing here opts a page *into* caching; it only stops
 * blocking the ones that ask.
 *
 * The original worry — a deploy failing because an upstream API was down while
 * the build prerendered — does not apply to the pages that opted in. Every data
 * function they call (`@/lib/anime/browse`, `@/lib/blog/queries`,
 * `@/lib/blog/tags`) catches its own failures and degrades to stale cache or an
 * empty result rather than throwing, and `revalidate` then replaces a thin
 * prerender within the hour. `sitemap.xml` stays `force-dynamic` for its own
 * reasons.
 */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

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
      // HilltopAds site ownership. Its tag is a bare token used as both the
      // meta name and its content, so it has no `verification` shorthand of
      // its own and goes through `other`.
      other: {
        [HILLTOPADS_VERIFICATION]: HILLTOPADS_VERIFICATION,
        // Bing Webmaster Tools site ownership. Next.js has no `bing`
        // shorthand, so the `msvalidate.01` meta name goes through `other`.
        "msvalidate.01": BING_VERIFICATION,
      },
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
