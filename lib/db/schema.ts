import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  boolean,
  text,
  primaryKey,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email').unique().notNull(),
  firstName: varchar('first_name'),
  lastName: varchar('last_name'),
  avatarUrl: varchar('avatar_url'),
  timezone: varchar('timezone').default('UTC'),

  // Authentication
  passwordHash: varchar('password_hash'),

  // OAuth provider IDs (NextAuth.js compatible)
  googleId: varchar('google_id'),
  facebookId: varchar('facebook_id'),
  linkedinId: varchar('linkedin_id'),
  twitterId: varchar('twitter_id'),

  // User metadata
  emailVerified: boolean('email_verified').default(false),
  isActive: boolean('is_active').default(true),
  currentOnboardingStep: varchar('current_onboarding_step').default('1'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// NextAuth.js required tables
export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('userId').notNull(),
    type: varchar('type').notNull(),
    provider: varchar('provider').notNull(),
    providerAccountId: varchar('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: timestamp('expires_at'),
    token_type: varchar('token_type'),
    scope: varchar('scope'),
    id_token: text('id_token'),
    session_state: varchar('session_state'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  account => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: varchar('identifier').notNull(),
    token: varchar('token').notNull(),
    expires: timestamp('expires').notNull(),
    type: varchar('type').default('email_verification'), // 'email_verification' or 'password_reset'
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  vt => ({
    compoundKey: primaryKey({
      columns: [vt.identifier, vt.token],
    }),
  })
);
