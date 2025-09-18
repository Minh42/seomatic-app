ALTER TABLE "checkout_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "checkout_sessions" CASCADE;--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "stripe_product_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "stripe_price_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "team_members" ALTER COLUMN "organization_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "organization_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "created_by_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "paused_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "pause_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "stripe_payment_link";--> statement-breakpoint
DROP TYPE "public"."checkout_session_status";