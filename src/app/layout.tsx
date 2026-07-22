import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";

import { SiteHeader } from "@/components/header";
import { HeaderGate } from "@/components/header/header-gate";
import { getSiteUrlObject } from "@/lib/seo/site";
import { StoreProvider } from "@/store/provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home.hero");
  const locale = await getLocale();
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
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: "Minna",
      locale,
      title: "Minna — Watch Anime Online",
      description,
      url: "/",
    },
    twitter: {
      card: "summary_large_image",
      title: "Minna — Watch Anime Online",
      description,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
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
