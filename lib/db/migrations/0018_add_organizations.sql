-- Create organizations table
CREATE TABLE IF NOT EXISTS "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add organizationId to workspaces
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "created_by_id" uuid;

-- Add organizationId to team_members
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "organization_id" uuid;

-- Add foreign key constraints
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;

-- Migrate existing data
-- Create organizations for existing workspace owners
INSERT INTO "organizations" ("name", "owner_id", "created_at", "updated_at")
SELECT DISTINCT 
    COALESCE(u.name, u.email, 'My Organization') as name,
    w.owner_id,
    MIN(w.created_at) as created_at,
    NOW() as updated_at
FROM "workspaces" w
INNER JOIN "users" u ON w.owner_id = u.id
GROUP BY w.owner_id, u.name, u.email
ON CONFLICT DO NOTHING;

-- Update workspaces with organizationId and createdById
UPDATE "workspaces" w
SET 
    "organization_id" = o.id,
    "created_by_id" = w.owner_id
FROM "organizations" o
WHERE w.owner_id = o.owner_id
AND w.organization_id IS NULL;

-- Update team_members with organizationId
UPDATE "team_members" tm
SET "organization_id" = o.id
FROM "organizations" o
WHERE tm.user_id = o.owner_id
AND tm.organization_id IS NULL;