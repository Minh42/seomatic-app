-- Add organization_name column to users table for onboarding step 2
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_name VARCHAR;