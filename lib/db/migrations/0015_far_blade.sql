ALTER TABLE "connections" RENAME COLUMN "domain" TO "connection_url";--> statement-breakpoint
ALTER TABLE "connections" DROP CONSTRAINT "connections_domain_unique";--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_connection_url_unique" UNIQUE("connection_url");