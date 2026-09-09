CREATE TABLE "access_role" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"grants" jsonb NOT NULL,
	"protected" boolean DEFAULT false NOT NULL,
	CONSTRAINT "access_role_name_unique" UNIQUE("name")
);
--> statement-breakpoint
INSERT INTO "access_role" ("id", "name", "grants", "protected") VALUES
('user', 'Usuário', '["tasks:read","tasks:create","tasks:update","tasks:set-status","tasks:delete"]', true),
('admin', 'Administrador', '["tasks:read","tasks:create","tasks:update","tasks:set-status","tasks:delete","access:manage"]', true);
