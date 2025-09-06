ALTER TABLE "users" ADD COLUMN "use_cases" text[];--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "other_use_case" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "professional_role" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "other_professional_role" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_size" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "industry" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "other_industry" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "discovery_source" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "other_discovery_source" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "previous_attempts" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_current_step" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "onboarding_data";