CREATE TYPE "public"."blog_media_source" AS ENUM('upload', 'link');--> statement-breakpoint
CREATE TABLE "blog_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"alt" text,
	"caption" text,
	"width" integer,
	"height" integer,
	"source" "blog_media_source" DEFAULT 'link' NOT NULL,
	"public_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_media_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "blog_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blogs_to_tags" (
	"blog_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "blogs_to_tags_blog_id_tag_id_pk" PRIMARY KEY("blog_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "blogs" ADD COLUMN "cover_image_alt" text;--> statement-breakpoint
ALTER TABLE "blogs" ADD COLUMN "author_url" text;--> statement-breakpoint
ALTER TABLE "blogs" ADD COLUMN "language" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "blogs_to_tags" ADD CONSTRAINT "blogs_to_tags_blog_id_blogs_id_fk" FOREIGN KEY ("blog_id") REFERENCES "public"."blogs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blogs_to_tags" ADD CONSTRAINT "blogs_to_tags_tag_id_blog_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."blog_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blog_media_recent_idx" ON "blog_media" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "blogs_to_tags_tag_idx" ON "blogs_to_tags" USING btree ("tag_id");