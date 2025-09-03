import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

// Placeholder schema - will be defined later
// This file will contain all database table definitions

export const placeholder = pgTable('placeholder', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
