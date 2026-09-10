CREATE TABLE "guides" (
	"slug" text PRIMARY KEY NOT NULL,
	"draft" jsonb NOT NULL,
	"published" jsonb,
	"version" integer NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
