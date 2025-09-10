ALTER TABLE "checkout_sessions" ADD COLUMN "stripe_customer_id" varchar;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD COLUMN "stripe_subscription_id" varchar;