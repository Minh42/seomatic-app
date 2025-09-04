CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"name" varchar,
	"avatar_url" varchar,
	"timezone" varchar DEFAULT 'UTC',
	"google_id" varchar,
	"facebook_id" varchar,
	"linkedin_id" varchar,
	"twitter_id" varchar,
	"email_verified" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
