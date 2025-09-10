CREATE TYPE "public"."billing_frequency" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."checkout_session_status" AS ENUM('pending', 'completed', 'expired');--> statement-breakpoint
ALTER TYPE "public"."subscription_status" ADD VALUE 'unpaid';--> statement-breakpoint
CREATE TABLE "checkout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_session_id" varchar NOT NULL,
	"email" varchar NOT NULL,
	"plan_id" uuid NOT NULL,
	"signup_token" varchar NOT NULL,
	"status" "checkout_session_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "checkout_sessions_stripe_session_id_unique" UNIQUE("stripe_session_id"),
	CONSTRAINT "checkout_sessions_signup_token_unique" UNIQUE("signup_token")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_product_id" varchar NOT NULL,
	"stripe_price_id" varchar NOT NULL,
	"stripe_payment_link" varchar,
	"name" varchar NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"frequency" "billing_frequency" NOT NULL,
	"level" integer NOT NULL,
	"is_recommended" boolean DEFAULT false NOT NULL,
	"features" text[],
	"max_nb_of_credits" integer NOT NULL,
	"max_nb_of_pages" integer NOT NULL,
	"max_nb_of_seats" integer NOT NULL,
	"max_nb_of_sites" integer NOT NULL,
	"white_label_enabled" boolean DEFAULT false NOT NULL,
	"overage_rate_per_page" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "plan_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "cancel_at_period_end" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "trial_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "plan_type";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "max_domains";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "max_team_members";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "max_pages";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "max_words";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "overage_rate_per_page";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "white_label_enabled";