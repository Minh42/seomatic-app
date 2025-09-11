CREATE TYPE "public"."domain_status" AS ENUM('pending', 'connected', 'failed', 'disconnected');--> statement-breakpoint
CREATE TABLE "domain_cms_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"api_username" varchar,
	"encrypted_api_token" text,
	"cms_site_id" varchar,
	"last_sync_at" timestamp,
	"last_sync_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "domain_cms_connections_domain_id_unique" UNIQUE("domain_id")
);
--> statement-breakpoint
CREATE TABLE "domain_hosted_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"verification_token" varchar,
	"verification_method" varchar DEFAULT 'DNS',
	"verified_at" timestamp,
	"cdn_config" json,
	"ssl_certificate_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "domain_hosted_connections_domain_id_unique" UNIQUE("domain_id")
);
--> statement-breakpoint
ALTER TABLE "domains" ADD COLUMN "status" "domain_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "domain_cms_connections" ADD CONSTRAINT "domain_cms_connections_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_hosted_connections" ADD CONSTRAINT "domain_hosted_connections_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains" DROP COLUMN "api_username";--> statement-breakpoint
ALTER TABLE "domains" DROP COLUMN "encrypted_api_token";--> statement-breakpoint
ALTER TABLE "domains" DROP COLUMN "cms_site_id";--> statement-breakpoint
ALTER TABLE "domains" DROP COLUMN "connection_status";--> statement-breakpoint
ALTER TABLE "domains" DROP COLUMN "last_sync_at";--> statement-breakpoint
ALTER TABLE "domains" DROP COLUMN "last_sync_error";--> statement-breakpoint
ALTER TABLE "domains" DROP COLUMN "hosted_config";--> statement-breakpoint
ALTER TABLE "domains" DROP COLUMN "verification_status";--> statement-breakpoint
ALTER TABLE "domains" DROP COLUMN "verification_token";--> statement-breakpoint
ALTER TABLE "domains" DROP COLUMN "verified_at";