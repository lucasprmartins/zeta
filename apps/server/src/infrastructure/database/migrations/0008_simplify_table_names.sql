ALTER TABLE "console"."access_role" SET SCHEMA "auth";
--> statement-breakpoint
ALTER TABLE "auth"."access_role" RENAME TO "access";
--> statement-breakpoint
ALTER TABLE "auth"."auth_account" RENAME TO "account";
--> statement-breakpoint
ALTER TABLE "auth"."auth_session" RENAME TO "session";
--> statement-breakpoint
ALTER TABLE "auth"."auth_user" RENAME TO "user";
--> statement-breakpoint
ALTER TABLE "auth"."auth_verification" RENAME TO "verification";
--> statement-breakpoint
ALTER TABLE "console"."registration_settings" RENAME TO "registration";
--> statement-breakpoint
ALTER TABLE "auth"."access" RENAME CONSTRAINT "access_role_name_unique" TO "access_name_unique";
--> statement-breakpoint
ALTER TABLE "auth"."session" RENAME CONSTRAINT "auth_session_token_unique" TO "session_token_unique";
--> statement-breakpoint
ALTER TABLE "auth"."user" RENAME CONSTRAINT "auth_user_username_unique" TO "user_username_unique";
--> statement-breakpoint
ALTER TABLE "auth"."user" RENAME CONSTRAINT "auth_user_email_unique" TO "user_email_unique";
--> statement-breakpoint
ALTER TABLE "auth"."account" RENAME CONSTRAINT "auth_account_user_id_auth_user_id_fk" TO "account_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "auth"."session" RENAME CONSTRAINT "auth_session_user_id_auth_user_id_fk" TO "session_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."tasks" RENAME CONSTRAINT "tasks_owner_id_auth_user_id_fk" TO "tasks_owner_id_user_id_fk";
