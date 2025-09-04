import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const connectionString = process.env.DATABASE_URL;

const client = postgres(connectionString, {
  prepare: false,
  max: 20,
  idle_timeout: 20,
  connect_timeout: 60,
});

export const db = drizzle(client, { schema });
