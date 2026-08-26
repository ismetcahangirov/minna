ALTER TABLE "blogs" ADD COLUMN "translation_group_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "blogs_translation_language_unique" ON "blogs" USING btree ("translation_group_id","language");--> statement-breakpoint
CREATE INDEX "blogs_translation_group_idx" ON "blogs" USING btree ("translation_group_id");