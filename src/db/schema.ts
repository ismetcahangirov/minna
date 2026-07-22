import {
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
