ALTER TABLE "users" DROP COLUMN IF EXISTS "failed_login_attempts";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "locked_until";--> statement-breakpoint
DROP TABLE IF EXISTS "sessions";--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "accounts_pkey";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "id";