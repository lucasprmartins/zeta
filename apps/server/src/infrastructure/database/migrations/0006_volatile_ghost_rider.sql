CREATE TABLE "registration_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"allow_sign_up" boolean NOT NULL,
	"require_approval" boolean NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_user" ADD COLUMN "approval_pending" boolean DEFAULT false NOT NULL;