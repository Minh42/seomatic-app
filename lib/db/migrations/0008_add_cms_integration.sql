-- Add CMS integration fields to users table
ALTER TABLE "users" ADD COLUMN "cms_integration" varchar;
ALTER TABLE "users" ADD COLUMN "other_cms" text;