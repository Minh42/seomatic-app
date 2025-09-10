ALTER TABLE "checkout_sessions" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."checkout_session_status";--> statement-breakpoint
CREATE TYPE "public"."checkout_session_status" AS ENUM('pending', 'completed');--> statement-breakpoint
ALTER TABLE "checkout_sessions" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."checkout_session_status";--> statement-breakpoint
ALTER TABLE "checkout_sessions" ALTER COLUMN "status" SET DATA TYPE "public"."checkout_session_status" USING "status"::"public"."checkout_session_status";--> statement-breakpoint
ALTER TABLE "checkout_sessions" DROP COLUMN "expires_at";