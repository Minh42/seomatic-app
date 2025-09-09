-- Rename users table to user
ALTER TABLE IF EXISTS "users" RENAME TO "user";

-- Rename accounts table to account  
ALTER TABLE IF EXISTS "accounts" RENAME TO "account";

-- Fix expires_at column type in account table (cast to bigint)
ALTER TABLE "account" 
  ALTER COLUMN "expires_at" TYPE bigint USING expires_at::bigint;

-- Add unique constraint to user email if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_email_unique'
  ) THEN
    ALTER TABLE "user" ADD CONSTRAINT "user_email_unique" UNIQUE ("email");
  END IF;
END $$;