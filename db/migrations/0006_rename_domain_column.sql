-- Rename the domain column to connection_url in the connections table
ALTER TABLE "connections" RENAME COLUMN "domain" TO "connection_url";