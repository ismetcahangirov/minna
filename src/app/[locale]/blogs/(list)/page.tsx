import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BlogList } from "@/components/blog/blog-list";
import { JsonLd } from "@/components/seo/json-ld";
import { Link } from "@/i18n/navigation";
import { localePath } from "@/i18n/paths";
import { resolveLocale, type LocaleRouteProps } from "@/i18n/route-locale";
import { listBlogs } from "@/lib/blog/queries";
import { listBlogTags } from "@/lib/blog/tags";
import { buildBlogListJsonLd } from "@/lib/seo/blog-jsonld";
import {
  localeAlternates,
  openGraphLocaleSet,
} from "@/lib/seo/locale-alternates";

export async function generateMetadata({
  params,
}: LocaleRouteProps): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "browse.blogs" });
  const title = `${t("title")} — Minna`;
  const description = t("subtitle");

  return {
    title,
    description,
    alternates: localeAlternates("/blogs", locale),
    openGraph: {
      ...openGraphLocaleSet(locale),
      title,
      description,
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * Blogs page (LIST-03). The shell and the first page of posts are
 * server-rendered for SEO and a no-flash first paint; the {@link BlogList}
 * client island takes over for infinite scroll.
 */
export default async function BlogsPage({ params }: LocaleRouteProps) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "browse.blogs" });
  const [initialPage, tags] = await Promise.all([
    // The listing collapses each translation group to the version that best
    // matches the *routed* locale, not a cookie — so `/tr/blogs` and `/blogs`
    // are two URLs with two stable selections rather than one URL that varies.
    listBlogs(1, locale),
    listBlogTags(),
  ]);

  // Names the page as a curated collection and its first page of posts, so
  // `/blogs` reads as the blog's hub rather than one more page of prose.
  const jsonLd = buildBlogListJsonLd({
    path: localePath("/blogs", locale),
    name: t("heading"),
    description: t("subtitle"),
    posts: initialPage.items,
  });

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8">
      <JsonLd data={jsonLd} />
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t("heading")}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
          {t("subtitle")}
        </p>
      </header>

      {tags.length > 0 && (
        <nav aria-label={t("tag.browseByTopic")} className="mb-8">
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag.slug}>
                <Link
                  href={`/blogs/tag/${tag.slug}`}
                  rel="tag"
                  className="border-border text-muted-foreground hover:border-primary hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium tracking-wide uppercase transition-colors outline-none focus-visible:ring-2"
                >
                  {tag.name}
                  <span className="text-muted-foreground/60 tabular-nums">
                    {tag.postCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <BlogList initialPage={initialPage} />
    </main>
  );
}
