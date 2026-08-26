import type { JsonLdData } from "@/components/seo/json-ld";
import type { BlogHeading } from "@/lib/blog/markdown";
import type { BlogDetail, BlogSummary } from "@/lib/blog/types";
import { localePath } from "@/i18n/paths";
import { blogPostHref, postLocale } from "@/lib/blog/href";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site";

/** How much body text a `BlogPosting.description` carries at most. */
const DESCRIPTION_LIMIT = 300;

/** The publisher node every blog page points at, by `@id`. */
function publisherRef() {
  return { "@id": `${getSiteUrl()}/#organization` };
}

/** Trims to a whole word rather than cutting mid-word. */
function clamp(text: string, limit: number): string {
  const value = text.trim();
  if (value.length <= limit) return value;
  const cut = value.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** The post's description: the editor's excerpt, else the opening body text. */
export function blogDescription(post: BlogDetail, bodyText: string): string {
  const excerpt = post.excerpt?.trim();
  return clamp(
    excerpt && excerpt.length > 0 ? excerpt : bodyText,
    DESCRIPTION_LIMIT,
  );
}

interface BlogJsonLdInput {
  post: BlogDetail;
  /** Plain body text, for the description fallback. */
  bodyText: string;
  wordCount: number;
  readingMinutes: number;
  /** Body headings — published as the article's `hasPart` sections. */
  headings: BlogHeading[];
  /** Body image URLs, appended after the cover. */
  bodyImages: string[];
}

/**
 * Structured data for a blog post (PERF-01 / SEO-05): a `BlogPosting` plus a
 * `BreadcrumbList`.
 *
 * The pieces here are the ones a crawler cannot infer from the prose:
 *
 * - `author` as a `Person` with a `url` when the editor supplied one. A bare
 *   name is not an entity; a name with a profile is the authorship signal
 *   behind E-E-A-T.
 * - `datePublished` / `dateModified` as distinct values. The publish date is
 *   backdatable by an editor, so the row's `updated_at` is the only honest
 *   answer to "when did this last change".
 * - `hasPart` sections built from the body's headings, each with the `#id` the
 *   renderer wrote. This is what makes individual passages addressable rather
 *   than leaving the post as one opaque block.
 * - `keywords` / `about` from the post's tags, tying it to the tag archives.
 *
 * `articleBody` is deliberately omitted: it duplicates the rendered page for no
 * gain and inflates the document on long posts.
 */
export function buildBlogJsonLd({
  post,
  bodyText,
  wordCount,
  readingMinutes,
  headings,
  bodyImages,
}: BlogJsonLdInput): JsonLdData {
  const url = absoluteUrl(blogPostHref(post));
  // A post's surrounding pages are named in the post's own language, because
  // that is the only locale the post is served in (I18N-07) — a Turkish
  // article's breadcrumb has to lead to `/tr/blogs`, not to the English hub.
  const locale = postLocale(post.language);
  const images = [post.coverImage, ...bodyImages].filter((src): src is string =>
    Boolean(src),
  );

  const posting: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: clamp(post.title, 110),
    description: blogDescription(post, bodyText),
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    inLanguage: post.language,
    publisher: publisherRef(),
    isAccessibleForFree: true,
    wordCount,
    // ISO 8601 duration — how long the post takes to read.
    timeRequired: `PT${readingMinutes}M`,
  };

  if (images.length > 0) posting.image = images;
  if (post.author) {
    posting.author = post.authorUrl
      ? { "@type": "Person", name: post.author, url: post.authorUrl }
      : { "@type": "Person", name: post.author };
  }
  if (post.tags.length > 0) {
    posting.keywords = post.tags.map((tag) => tag.name).join(", ");
    posting.about = post.tags.map((tag) => ({
      "@type": "Thing",
      name: tag.name,
      url: absoluteUrl(localePath(`/blogs/tag/${tag.slug}`, locale)),
    }));
  }
  if (headings.length > 0) {
    posting.hasPart = headings.map((heading) => ({
      "@type": "WebPageElement",
      name: heading.text,
      url: `${url}#${heading.id}`,
    }));
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: absoluteUrl(localePath("/", locale)),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blogs",
        item: absoluteUrl(localePath("/blogs", locale)),
      },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  return [posting, breadcrumb];
}

/**
 * Structured data for a collection of posts — the `/blogs` index and each tag
 * archive (SEO-05).
 *
 * A `Blog`/`CollectionPage` whose `blogPost` items name the posts on the page
 * tells a crawler that this URL is a curated list about one topic, not another
 * page of prose. Without it a tag archive reads as thin duplicate content;
 * with it, it reads as the hub of a topic cluster.
 */
export function buildBlogListJsonLd(options: {
  path: string;
  name: string;
  description: string;
  posts: BlogSummary[];
  /** `Blog` for the index; `CollectionPage` for a tag archive. */
  type?: "Blog" | "CollectionPage";
}): JsonLdData {
  const url = absoluteUrl(options.path);

  return {
    "@context": "https://schema.org",
    "@type": options.type ?? "Blog",
    "@id": `${url}#collection`,
    name: options.name,
    description: options.description,
    url,
    publisher: publisherRef(),
    blogPost: options.posts.map((post) => ({
      "@type": "BlogPosting",
      headline: clamp(post.title, 110),
      url: absoluteUrl(blogPostHref(post)),
      datePublished: post.publishedAt,
      ...(post.coverImage ? { image: post.coverImage } : {}),
      ...(post.author
        ? { author: { "@type": "Person", name: post.author } }
        : {}),
    })),
  };
}
