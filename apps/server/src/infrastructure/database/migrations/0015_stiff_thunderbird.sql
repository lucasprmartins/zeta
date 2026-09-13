CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
--> statement-breakpoint
CREATE INDEX "tasks_title_search_idx" ON "public"."tasks" USING gin ("title" gin_trgm_ops);
