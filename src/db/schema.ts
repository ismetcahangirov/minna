import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
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
export const blogs = pgTable("blogs", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  // Short summary shown on the listing card; falls back to none when empty.
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  coverImage: text("cover_image"),
  author: text("author"),
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
