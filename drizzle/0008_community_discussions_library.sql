CREATE TYPE "public"."discussion_scope" AS ENUM('anime', 'season', 'episode');--> statement-breakpoint
CREATE TYPE "public"."library_status" AS ENUM('watching', 'completed', 'on_hold', 'dropped', 'planned');--> statement-breakpoint
CREATE TABLE "discussion_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid,
	"scope" "discussion_scope" NOT NULL,
	"anime_id" text NOT NULL,
	"anime_title" text NOT NULL,
	"anime_image" text,
	"season_id" text,
	"season_label" text,
	"episode_number" integer,
	"title" text NOT NULL,
	"body" text,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"last_post_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"auto" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"anime_id" text NOT NULL,
	"title" text NOT NULL,
	"image" text,
	"status" "library_status" DEFAULT 'watching' NOT NULL,
	"status_locked" boolean DEFAULT false NOT NULL,
	"episodes_watched" integer DEFAULT 0 NOT NULL,
	"total_episodes" integer,
	"last_episode_number" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_library_user_anime_unique" UNIQUE("user_id","anime_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "handle" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "library_public" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_thread_id_discussion_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."discussion_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_library" ADD CONSTRAINT "user_library_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discussion_posts_thread_idx" ON "discussion_posts" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "discussion_threads_activity_idx" ON "discussion_threads" USING btree ("last_post_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "discussion_threads_anime_idx" ON "discussion_threads" USING btree ("anime_id","last_post_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "discussion_threads_auto_episode_unique" ON "discussion_threads" USING btree ("anime_id","episode_number") WHERE auto;--> statement-breakpoint
CREATE INDEX "user_library_user_status_idx" ON "user_library" USING btree ("user_id","status","updated_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_handle_unique" UNIQUE("handle");