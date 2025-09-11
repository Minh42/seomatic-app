-- Step 1: Create new tables for CMS and hosted connections
CREATE TABLE IF NOT EXISTS "domain_cms_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "domain_id" uuid NOT NULL UNIQUE,
  "api_username" varchar,
  "encrypted_api_token" text,
  "cms_site_id" varchar,
  "webhook_url" varchar,
  "last_sync_at" timestamp,
  "last_sync_error" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "domain_hosted_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "domain_id" uuid NOT NULL UNIQUE,
  "verification_token" varchar,
  "verification_method" varchar DEFAULT 'DNS',
  "cdn_config" json,
  "ssl_certificate_id" varchar,
  "verified_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Step 2: Add foreign key constraints
ALTER TABLE "domain_cms_connections" 
  ADD CONSTRAINT "domain_cms_connections_domain_id_fkey" 
  FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;

ALTER TABLE "domain_hosted_connections" 
  ADD CONSTRAINT "domain_hosted_connections_domain_id_fkey" 
  FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE;

-- Step 3: Add single status column to domains (replacing connection_status and verification_status)
ALTER TABLE "domains" ADD COLUMN "status" varchar DEFAULT 'pending';

-- Step 4: Migrate existing data based on connection_type
-- For CMS connections
INSERT INTO "domain_cms_connections" (
  "domain_id",
  "api_username",
  "encrypted_api_token",
  "cms_site_id",
  "last_sync_at",
  "last_sync_error",
  "created_at",
  "updated_at"
)
SELECT 
  id,
  api_username,
  encrypted_api_token,
  cms_site_id,
  last_sync_at,
  last_sync_error,
  created_at,
  updated_at
FROM "domains"
WHERE "connection_type" IN ('wordpress', 'webflow', 'shopify', 'ghost');

-- For hosted connections
INSERT INTO "domain_hosted_connections" (
  "domain_id",
  "verification_token",
  "cdn_config",
  "verified_at",
  "created_at",
  "updated_at"
)
SELECT 
  id,
  verification_token,
  hosted_config,
  verified_at,
  created_at,
  updated_at
FROM "domains"
WHERE "connection_type" = 'hosted';

-- Step 5: Update status based on old status columns
UPDATE "domains" 
SET "status" = CASE 
  WHEN "connection_type" IN ('wordpress', 'webflow', 'shopify', 'ghost') THEN
    CASE 
      WHEN "connection_status" = 'verified' THEN 'connected'
      WHEN "connection_status" = 'failed' THEN 'failed'
      ELSE 'pending'
    END
  WHEN "connection_type" = 'hosted' THEN
    CASE 
      WHEN "verification_status" = 'verified' THEN 'connected'
      WHEN "verification_status" = 'failed' THEN 'failed'
      ELSE 'pending'
    END
  ELSE 'pending'
END;

-- Step 6: Drop old columns from domains table
ALTER TABLE "domains" DROP COLUMN IF EXISTS "api_username";
ALTER TABLE "domains" DROP COLUMN IF EXISTS "encrypted_api_token";
ALTER TABLE "domains" DROP COLUMN IF EXISTS "cms_site_id";
ALTER TABLE "domains" DROP COLUMN IF EXISTS "connection_status";
ALTER TABLE "domains" DROP COLUMN IF EXISTS "last_sync_at";
ALTER TABLE "domains" DROP COLUMN IF EXISTS "last_sync_error";
ALTER TABLE "domains" DROP COLUMN IF EXISTS "hosted_config";
ALTER TABLE "domains" DROP COLUMN IF EXISTS "verification_status";
ALTER TABLE "domains" DROP COLUMN IF EXISTS "verification_token";
ALTER TABLE "domains" DROP COLUMN IF EXISTS "verified_at";

-- Step 7: Create enum for domain status if not exists
DO $$ BEGIN
  CREATE TYPE "domain_status" AS ENUM ('pending', 'connected', 'failed', 'disconnected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 8: Update status column to use enum
ALTER TABLE "domains" 
  ALTER COLUMN "status" TYPE "domain_status" 
  USING "status"::"domain_status";

ALTER TABLE "domains" 
  ALTER COLUMN "status" SET DEFAULT 'pending'::"domain_status";

ALTER TABLE "domains" 
  ALTER COLUMN "status" SET NOT NULL;