ALTER TABLE "projects" RENAME TO "tasks";--> statement-breakpoint
ALTER TABLE "tasks" RENAME COLUMN "name" TO "title";--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "projects_owner_id_auth_user_id_fk";
--> statement-breakpoint
DROP INDEX "projects_owner_created_idx";--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "updated_at" timestamp with time zone;--> statement-breakpoint
UPDATE "tasks" SET "updated_at" = "created_at";--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "title" TYPE varchar(120);--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_id_auth_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_owner_created_idx" ON "tasks" USING btree ("owner_id","created_at","id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_status_check" CHECK ("tasks"."status" in ('pending', 'completed'));--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completion_check" CHECK (("tasks"."status" = 'pending' and "tasks"."completed_at" is null) or ("tasks"."status" = 'completed' and "tasks"."completed_at" is not null));
