CREATE TYPE "public"."suspension_reason" AS ENUM('plan_downgrade', 'subscription_paused');--> statement-breakpoint
ALTER TYPE "public"."status" ADD VALUE 'suspended';--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "suspension_reason" "suspension_reason";