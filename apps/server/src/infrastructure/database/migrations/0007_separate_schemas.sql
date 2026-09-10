CREATE SCHEMA "auth";
--> statement-breakpoint
CREATE SCHEMA "console";
--> statement-breakpoint
ALTER TABLE "public"."access_role" SET SCHEMA "console";
--> statement-breakpoint
ALTER TABLE "public"."auth_account" SET SCHEMA "auth";
--> statement-breakpoint
ALTER TABLE "public"."auth_session" SET SCHEMA "auth";
--> statement-breakpoint
ALTER TABLE "public"."auth_user" SET SCHEMA "auth";
--> statement-breakpoint
ALTER TABLE "public"."auth_verification" SET SCHEMA "auth";
--> statement-breakpoint
ALTER TABLE "public"."registration_settings" SET SCHEMA "console";
