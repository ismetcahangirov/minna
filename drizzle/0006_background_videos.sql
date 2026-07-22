CREATE TYPE "public"."background_page" AS ENUM('login', 'profile', 'search', 'not_found', 'admin');--> statement-breakpoint
CREATE TYPE "public"."background_variant" AS ENUM('desktop', 'mobile', 'tablet');--> statement-breakpoint
CREATE TABLE "background_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page" "background_page" NOT NULL,
	"variant" "background_variant" DEFAULT 'desktop' NOT NULL,
	"video_url" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "background_videos_page_variant_unique" UNIQUE("page","variant")
);
