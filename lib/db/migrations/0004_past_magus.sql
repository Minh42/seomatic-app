ALTER TABLE "users" ADD COLUMN "failed_login_attempts" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locked_until" timestamp;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD COLUMN "type" varchar DEFAULT 'email_verification' NOT NULL;