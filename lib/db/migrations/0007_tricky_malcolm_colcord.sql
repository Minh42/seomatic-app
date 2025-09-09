ALTER TABLE "accounts" ALTER COLUMN "expires_at" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "team_members" ALTER COLUMN "member_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_tokens" ALTER COLUMN "type" SET DEFAULT 'password_reset';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "name" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "emailVerified" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "image" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cms_integration" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "other_cms" text;--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "first_name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "last_name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "avatar_url";