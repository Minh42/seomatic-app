ALTER TABLE "connections" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "connections" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."connection_status";--> statement-breakpoint
CREATE TYPE "public"."connection_status" AS ENUM('pending', 'active', 'error');--> statement-breakpoint
ALTER TABLE "connections" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."connection_status";--> statement-breakpoint
ALTER TABLE "connections" ALTER COLUMN "status" SET DATA TYPE "public"."connection_status" USING "status"::"public"."connection_status";