ALTER TABLE "public"."tasks" RENAME COLUMN "owner_id" TO "author_id";--> statement-breakpoint
ALTER TABLE "public"."tasks" RENAME CONSTRAINT "tasks_owner_id_user_id_fk" TO "tasks_author_id_user_id_fk";--> statement-breakpoint
DROP INDEX "public"."tasks_owner_created_idx";--> statement-breakpoint
ALTER TABLE "public"."tasks" ALTER COLUMN "author_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "public"."tasks" DROP CONSTRAINT "tasks_author_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "auth"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_created_idx" ON "public"."tasks" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "tasks_status_created_idx" ON "public"."tasks" USING btree ("status","created_at","id");--> statement-breakpoint
CREATE INDEX "tasks_author_idx" ON "public"."tasks" USING btree ("author_id");--> statement-breakpoint
CREATE TABLE "public"."task_mentions" (
	"task_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "task_mentions_task_id_user_id_pk" PRIMARY KEY("task_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "public"."task_mentions" ADD CONSTRAINT "task_mentions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."task_mentions" ADD CONSTRAINT "task_mentions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_mentions_user_idx" ON "public"."task_mentions" USING btree ("user_id");--> statement-breakpoint
UPDATE "auth"."access" SET "grants" = ("grants" #>> '{}')::jsonb WHERE jsonb_typeof("grants") = 'string';--> statement-breakpoint
UPDATE "auth"."access" SET "grants" = "grants" || '["tasks:mention"]'::jsonb WHERE "id" in ('user', 'admin') AND NOT ("grants" @> '["tasks:mention"]'::jsonb);
