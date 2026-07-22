"use client";

import { Newspaper } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useFormatter } from "next-intl";

import type { BlogSummary } from "@/lib/blog/types";

interface BlogCardProps {
  blog: BlogSummary;
  /** Set on the first cards so above-the-fold art is not lazy-loaded. */
  priority?: boolean;
}

/**
 * Vertical blog card for the Blogs listing (LIST-03): full-bleed cover image in
 * a portrait frame, title and excerpt below, with a flat dark scrim on hover
 * (design system — no gradient/glassmorphism, sharp corners, lucide icons).
 */
export function BlogCard({ blog, priority }: BlogCardProps) {
  const format = useFormatter();
  const published = new Date(blog.publishedAt);

  return (
    <Link
      href={`/blogs/${blog.slug}`}
      className="group focus-visible:ring-ring block w-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      <div className="border-border bg-surface group-hover:border-primary/60 relative aspect-[3/4] overflow-hidden border transition-[transform,border-color] duration-300 group-hover:z-10 group-hover:scale-[1.02] group-hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.9)]">
        {blog.coverImage ? (
          <Image
            src={blog.coverImage}
            alt={blog.title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 340px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center">
            <Newspaper className="size-8" aria-hidden />
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 transition-colors duration-300 group-hover:bg-black/50" />
      </div>

      <time
        dateTime={blog.publishedAt}
        className="text-muted-foreground mt-3 block text-xs tracking-wide uppercase"
      >
        {format.dateTime(published, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
        {blog.author ? ` · ${blog.author}` : ""}
      </time>
      <h3 className="text-foreground group-hover:text-primary mt-1 line-clamp-2 text-base font-semibold transition-colors">
        {blog.title}
      </h3>
      {blog.excerpt && (
        <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
          {blog.excerpt}
        </p>
      )}
    </Link>
  );
}

/** Loading placeholder matching {@link BlogCard}'s footprint (no CLS). */
export function BlogCardSkeleton() {
  return (
    <div className="w-full">
      <div className="bg-surface border-border aspect-[3/4] w-full animate-pulse border" />
      <div className="bg-surface mt-3 h-3 w-1/3 animate-pulse" />
      <div className="bg-surface mt-2 h-4 w-5/6 animate-pulse" />
      <div className="bg-surface mt-1.5 h-3 w-2/3 animate-pulse" />
    </div>
  );
}
