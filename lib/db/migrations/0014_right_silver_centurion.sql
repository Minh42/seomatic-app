ALTER TYPE "public"."domain_status" RENAME TO "connection_status";--> statement-breakpoint
ALTER TABLE "domain_cms_connections" RENAME TO "connection_cms";--> statement-breakpoint
ALTER TABLE "domain_hosted_connections" RENAME TO "connection_hosted";--> statement-breakpoint
ALTER TABLE "domains" RENAME TO "connections";--> statement-breakpoint
ALTER TABLE "connection_cms" RENAME COLUMN "domain_id" TO "connection_id";--> statement-breakpoint
ALTER TABLE "connection_hosted" RENAME COLUMN "domain_id" TO "connection_id";--> statement-breakpoint
ALTER TABLE "connection_cms" DROP CONSTRAINT "domain_cms_connections_domain_id_unique";--> statement-breakpoint
ALTER TABLE "connection_hosted" DROP CONSTRAINT "domain_hosted_connections_domain_id_unique";--> statement-breakpoint
ALTER TABLE "connections" DROP CONSTRAINT "domains_workspace_id_unique";--> statement-breakpoint
ALTER TABLE "connections" DROP CONSTRAINT "domains_domain_unique";--> statement-breakpoint
ALTER TABLE "connection_cms" DROP CONSTRAINT "domain_cms_connections_domain_id_domains_id_fk";
--> statement-breakpoint
ALTER TABLE "connection_hosted" DROP CONSTRAINT "domain_hosted_connections_domain_id_domains_id_fk";
--> statement-breakpoint
ALTER TABLE "connections" DROP CONSTRAINT "domains_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "connection_cms" ADD CONSTRAINT "connection_cms_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_hosted" ADD CONSTRAINT "connection_hosted_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_cms" ADD CONSTRAINT "connection_cms_connection_id_unique" UNIQUE("connection_id");--> statement-breakpoint
ALTER TABLE "connection_hosted" ADD CONSTRAINT "connection_hosted_connection_id_unique" UNIQUE("connection_id");--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_workspace_id_unique" UNIQUE("workspace_id");--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_domain_unique" UNIQUE("domain");