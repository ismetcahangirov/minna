import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

// Users are created on first Google login (AUTH-02); Google OAuth is the
// only auth method, so google_id is the stable external identity key.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  googleId: text("google_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  image: text("image"),
  // Public, URL-safe identity for the member directory (`/users/{handle}`),
  // derived from the display name at sign-in. Nullable so rows written before
  // the directory shipped still resolve (they fall back to their id).
  handle: text("handle").unique(),
  // Whether other members may open this profile and see its library. Opt-out,
  // not opt-in: the directory is the point of the feature.
  libraryPublic: boolean("library_public").notNull().default(true),
  role: userRoleEnum("role").notNull().default("user"),
  // Admin-set block flag (ADMIN-06). A blocked user cannot open a new session —
  // the Google sign-in flow rejects them — while their data (favorites, watch
  // history) is preserved unless the account is deleted.
  blocked: boolean("blocked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// A per-user anime bookmark (DETAIL-03). Anime ids come from Consumet/AniList
// (external, hence text — no FK). Title/image are denormalized so the
// favorites listing (EPIC-08) can render without a Consumet round-trip. The
// (user_id, anime_id) pair is unique so toggling on is idempotent.
export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    animeId: text("anime_id").notNull(),
    title: text("title").notNull(),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("favorites_user_anime_unique").on(table.userId, table.animeId),
  ],
);

export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;

// Pre-roll ads shown over the video player before an episode starts (PLAYER-02
// /PLAYER-03). Rows are managed from the admin panel (EPIC-12); the watch page
// only reads the active pool. `skipAfterSeconds` drives the countdown before
// the "Skip ad" button unlocks (default 5s, never hardcoded on the client), and
// `weight` biases random selection when several ads are active.
export const ads = pgTable("ads", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  videoUrl: text("video_url").notNull(),
  // Optional click-through destination when the viewer taps the ad.
  targetUrl: text("target_url"),
  // Optional cap on how long the ad plays before auto-advancing to the episode
  // (ADMIN-02). Null means play to the video's natural end.
  durationSeconds: integer("duration_seconds"),
  skipAfterSeconds: integer("skip_after_seconds").notNull().default(5),
  weight: integer("weight").notNull().default(1),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Ad = typeof ads.$inferSelect;
export type NewAd = typeof ads.$inferInsert;

// Per-user watch progress so a viewer resumes where they left off (PLAYER-05).
// Anime/episode ids are external Consumet ids (text, no FK). Position and
// duration are stored in whole seconds; the client throttles writes (interval +
// unload flush) rather than persisting every timeupdate. The (user, episode)
// pair is unique so progress is upserted in place. `title`/`image` are
// denormalized (like `favorites`) so the profile watch-history view (PROFILE-03)
// renders without a Consumet round-trip.
export const watchProgress = pgTable(
  "watch_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    animeId: text("anime_id").notNull(),
    episodeId: text("episode_id").notNull(),
    episodeNumber: integer("episode_number"),
    title: text("title"),
    image: text("image"),
    positionSeconds: integer("position_seconds").notNull().default(0),
    durationSeconds: integer("duration_seconds"),
    completed: boolean("completed").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("watch_progress_user_episode_unique").on(
      table.userId,
      table.episodeId,
    ),
  ],
);

export type WatchProgress = typeof watchProgress.$inferSelect;
export type NewWatchProgress = typeof watchProgress.$inferInsert;

// Editorial blog posts listed on the Blogs page and read on the blog detail
// page (LIST-03 / LIST-05). Rows are authored from the admin panel (EPIC-12);
// the public pages only read `published` posts. `slug` is the stable, unique
// URL segment (`/blogs/[slug]`); `coverImage` is the full-bleed background of
// the detail page. `publishedAt` (defaulting to creation time) drives the
// newest-first listing and can be backdated by an editor.
//
// `content` is Markdown (SEO-05), rendered server-side into semantic HTML —
// headings, lists, quotes and inline figures — so the body carries a real
// document outline instead of a flat run of paragraphs. Plain text written
// before that change is still valid Markdown and renders unchanged.
export const blogs = pgTable("blogs", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  // Short summary shown on the listing card; falls back to none when empty.
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  coverImage: text("cover_image"),
  // Alt text for the cover, so the one image every post has is described for
  // screen readers and image search instead of falling back to the title.
  coverImageAlt: text("cover_image_alt"),
  author: text("author"),
  // Author profile or homepage, published as the Person.url of the article
  // JSON-LD — the one authorship signal a bare name cannot carry (E-E-A-T).
  authorUrl: text("author_url"),
  // BCP-47 language of the body, emitted as `inLanguage`. A post is authored
  // in one language; the UI being EN/TR/RU does not translate it.
  language: text("language").notNull().default("en"),
  published: boolean("published").notNull().default(true),
  publishedAt: timestamp("published_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Blog = typeof blogs.$inferSelect;
export type NewBlog = typeof blogs.$inferInsert;

// A topic label shared across posts (SEO-05). A tag owns an archive page at
// `/blogs/tag/{slug}` and feeds the `about`/`keywords` of a post's JSON-LD, so
// the slug is the stable identity and the name is only the display label.
export const blogTags = pgTable("blog_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  // One-line intro shown on the archive page and used as its meta
  // description; a generated sentence stands in when it is empty.
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type BlogTag = typeof blogTags.$inferSelect;
export type NewBlogTag = typeof blogTags.$inferInsert;

// Which posts carry which tags. Deleting either side drops the link, never the
// counterpart — a tag outlives the posts that used it so its archive URL stays
// stable for crawlers that already indexed it.
export const blogsToTags = pgTable(
  "blogs_to_tags",
  {
    blogId: uuid("blog_id")
      .notNull()
      .references(() => blogs.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => blogTags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.blogId, table.tagId] }),
    // The tag archive page: every post carrying one tag.
    index("blogs_to_tags_tag_idx").on(table.tagId),
  ],
);

export type BlogToTag = typeof blogsToTags.$inferSelect;

// Where a media row's file lives. `upload` means Cloudinary holds the asset and
// the app may delete it; `link` means an editor pasted someone else's URL and
// removing the row must never try to delete the remote file.
export const blogMediaSourceEnum = pgEnum("blog_media_source", [
  "upload",
  "link",
]);

// The admin image library (ADMIN-05). Post bodies embed images by URL, so a row
// here is not required to render one — it exists so an admin can re-insert an
// image into another post without re-uploading, and so `alt`/`caption` written
// once are offered again. Intentionally not scoped to a post: an image is
// uploaded before the post it belongs to has an id.
export const blogMedia = pgTable(
  "blog_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull().unique(),
    // Default alt text offered when the image is inserted. Nullable because a
    // purely decorative image is correctly marked with an empty alt.
    alt: text("alt"),
    caption: text("caption"),
    width: integer("width"),
    height: integer("height"),
    source: blogMediaSourceEnum("source").notNull().default("link"),
    // Cloudinary public id, so deleting the row can delete the asset too.
    publicId: text("public_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("blog_media_recent_idx").on(table.createdAt.desc())],
);

export type BlogMedia = typeof blogMedia.$inferSelect;
export type NewBlogMedia = typeof blogMedia.$inferInsert;

// Which page an atmospheric background belongs to (ADMIN-04). Each page ships a
// built-in CSS/video default that lives in code and is never stored here; a row
// exists only when an admin has supplied an override.
export const backgroundPageEnum = pgEnum("background_page", [
  "login",
  "profile",
  "search",
  "not_found",
  "admin",
]);

// A page can carry breakpoint-specific overrides — profile is authored as
// mobile vs. tablet/web (`desktop`) separately (DESIGN-SPEC §6.2); other pages
// use `desktop` only. When a breakpoint has no row, the page's default shows.
export const backgroundVariantEnum = pgEnum("background_variant", [
  "desktop",
  "mobile",
  "tablet",
]);

// Admin-supplied atmospheric background overrides (ADMIN-04). Defaults are never
// stored — deleting a row simply falls back to the built-in default, so the
// default can never be destroyed. Each (page, variant) holds at most one
// override; the public resolver reads only `active` rows and the watch/player
// stack is unaffected. Video urls pass the ADMIN-03 format gate before a row is
// written.
export const backgroundVideos = pgTable(
  "background_videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    page: backgroundPageEnum("page").notNull(),
    variant: backgroundVariantEnum("variant").notNull().default("desktop"),
    videoUrl: text("video_url").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("background_videos_page_variant_unique").on(
      table.page,
      table.variant,
    ),
  ],
);

export type BackgroundVideo = typeof backgroundVideos.$inferSelect;
export type NewBackgroundVideo = typeof backgroundVideos.$inferInsert;

// --- Community: library, discussions (EPIC-17) ------------------------------

// How a member classifies an anime in their library. `watching`/`completed` are
// also derived automatically from watch progress; the remaining values are only
// ever set by hand.
export const libraryStatusEnum = pgEnum("library_status", [
  "watching",
  "completed",
  "on_hold",
  "dropped",
  "planned",
]);

/**
 * A member's library entry for one anime (LIB-01) — the "watching / finished"
 * shelf and the source of the per-anime progress bar.
 *
 * Written from two places: automatically, when the player records the first
 * ever completion of an episode (see `saveWatchProgress`), and by hand when the
 * member picks a status. Both go through a single upsert statement.
 *
 * Free-tier shape: `episodesWatched` is a denormalized counter, incremented
 * once per episode at the moment it flips to completed, so rendering a progress
 * bar never runs a COUNT over `watch_progress`. `title`/`image`/`totalEpisodes`
 * are denormalized the same way `favorites` does it, so the library page
 * renders with one indexed query and zero Consumet round-trips.
 *
 * `statusLocked` is set the moment the member chooses a status themselves;
 * from then on the automatic derivation never overwrites their choice.
 */
export const userLibrary = pgTable(
  "user_library",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    animeId: text("anime_id").notNull(),
    title: text("title").notNull(),
    image: text("image"),
    status: libraryStatusEnum("status").notNull().default("watching"),
    statusLocked: boolean("status_locked").notNull().default(false),
    /** Distinct episodes the member has finished (>=90% watched). */
    episodesWatched: integer("episodes_watched").notNull().default(0),
    /** Episode count as the catalog reported it; null while unknown. */
    totalEpisodes: integer("total_episodes"),
    /** Highest episode number reached, for the "continue from" line. */
    lastEpisodeNumber: integer("last_episode_number"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("user_library_user_anime_unique").on(table.userId, table.animeId),
    // Serves both the "all shelves" and the per-status tab listings, newest
    // first, without a sort step.
    index("user_library_user_status_idx").on(
      table.userId,
      table.status,
      table.updatedAt.desc(),
    ),
  ],
);

export type UserLibraryEntry = typeof userLibrary.$inferSelect;
export type NewUserLibraryEntry = typeof userLibrary.$inferInsert;

// What a discussion is attached to: a whole anime, one season (AniList models
// seasons as separate entries, so `seasonId` is itself an anime id), or a
// single episode.
export const discussionScopeEnum = pgEnum("discussion_scope", [
  "anime",
  "season",
  "episode",
]);

/**
 * A discussion thread (COMM-01). One table backs both the community page and
 * the per-episode review box: an episode's reviews are simply the posts of its
 * `scope = 'episode'` thread, so there is a single moderation path, a single
 * profanity gate and no second comments table to index on a free-tier database.
 *
 * `auto` marks the thread the site opened by itself the first time somebody
 * reviewed an episode (no opening post, not authored by a member); a partial
 * unique index keeps exactly one of those per (anime, episode).
 *
 * Free-tier shape: `replyCount` and `lastPostAt` are denormalized so the
 * listing never aggregates over `discussion_posts`, and `animeTitle`/
 * `animeImage` are denormalized so it never calls the catalog.
 */
export const discussionThreads = pgTable(
  "discussion_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Null for site-opened episode threads, and after the author's account is
    // deleted — the conversation outlives the account.
    authorId: uuid("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    scope: discussionScopeEnum("scope").notNull(),
    animeId: text("anime_id").notNull(),
    animeTitle: text("anime_title").notNull(),
    animeImage: text("anime_image"),
    /** AniList id of the chosen season entry (scope = 'season'). */
    seasonId: text("season_id"),
    /** Human label of that season as the switcher shows it ("Season 2"). */
    seasonLabel: text("season_label"),
    /** Episode number (scope = 'episode'). */
    episodeNumber: integer("episode_number"),
    title: text("title").notNull(),
    /** Opening post; null for site-opened episode threads. */
    body: text("body"),
    replyCount: integer("reply_count").notNull().default(0),
    lastPostAt: timestamp("last_post_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Set by an admin to stop new replies without deleting the thread. */
    locked: boolean("locked").notNull().default(false),
    auto: boolean("auto").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // The community listing: most recently active first.
    index("discussion_threads_activity_idx").on(table.lastPostAt.desc()),
    // Threads of one anime (detail page rail, anime filter).
    index("discussion_threads_anime_idx").on(
      table.animeId,
      table.lastPostAt.desc(),
    ),
    // At most one site-opened thread per episode; the watch page looks it up
    // by this exact pair.
    uniqueIndex("discussion_threads_auto_episode_unique")
      .on(table.animeId, table.episodeNumber)
      .where(sql`auto`),
  ],
);

export type DiscussionThread = typeof discussionThreads.$inferSelect;
export type NewDiscussionThread = typeof discussionThreads.$inferInsert;

/**
 * One message inside a thread (COMM-02) — a community reply or an episode
 * review, depending on the parent thread's scope. Deleting the thread or the
 * author's account removes the post.
 */
export const discussionPosts = pgTable(
  "discussion_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => discussionThreads.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Oldest-first reading of one thread, and the keyset pagination cursor.
    index("discussion_posts_thread_idx").on(table.threadId, table.createdAt),
  ],
);

export type DiscussionPost = typeof discussionPosts.$inferSelect;
export type NewDiscussionPost = typeof discussionPosts.$inferInsert;
