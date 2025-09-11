-- Step 1: Rename tables
ALTER TABLE "domains" RENAME TO "connections";
ALTER TABLE "domain_cms_connections" RENAME TO "connection_cms";
ALTER TABLE "domain_hosted_connections" RENAME TO "connection_hosted";

-- Step 2: Rename foreign key columns
ALTER TABLE "connection_cms" RENAME COLUMN "domain_id" TO "connection_id";
ALTER TABLE "connection_hosted" RENAME COLUMN "domain_id" TO "connection_id";

-- Step 3: Drop old constraints
ALTER TABLE "connection_cms" DROP CONSTRAINT IF EXISTS "domain_cms_connections_domain_id_fkey";
ALTER TABLE "connection_hosted" DROP CONSTRAINT IF EXISTS "domain_hosted_connections_domain_id_fkey";

-- Step 4: Add new constraints with updated names
ALTER TABLE "connection_cms" 
  ADD CONSTRAINT "connection_cms_connection_id_fkey" 
  FOREIGN KEY ("connection_id") REFERENCES "connections"("id") ON DELETE CASCADE;

ALTER TABLE "connection_hosted" 
  ADD CONSTRAINT "connection_hosted_connection_id_fkey" 
  FOREIGN KEY ("connection_id") REFERENCES "connections"("id") ON DELETE CASCADE;

-- Step 5: Update the connection_type enum to include database types (optional for now)
-- This can be done later when we add database support
-- ALTER TYPE "connection_type" ADD VALUE IF NOT EXISTS 'postgresql';
-- ALTER TYPE "connection_type" ADD VALUE IF NOT EXISTS 'mysql';