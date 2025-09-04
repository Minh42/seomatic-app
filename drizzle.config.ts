import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load environment-specific file
const envFile =
  process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
config({ path: envFile });

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
