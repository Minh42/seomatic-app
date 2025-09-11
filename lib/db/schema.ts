import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  boolean,
  text,
  primaryKey,
  integer,
  bigint,
  decimal,
  json,
  pgEnum,
} from 'drizzle-orm/pg-core';

// Enums
export const planTypeEnum = pgEnum('plan_type', [
  'starter',
  'growth',
  'agency',
  'enterprise',
]);
export const connectionTypeEnum = pgEnum('connection_type', [
  'wordpress',
  'webflow',
  'shopify',
  'ghost',
  'hosted',
]);
export const roleEnum = pgEnum('role', ['admin', 'member', 'viewer']);
export const clientRoleEnum = pgEnum('client_role', [
  'client_admin',
  'client_member',
  'client_viewer',
]);
export const statusEnum = pgEnum('status', ['pending', 'active', 'removed']);
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'canceled',
  'past_due',
  'trialing',
  'unpaid',
]);
export const billingFrequencyEnum = pgEnum('billing_frequency', [
  'monthly',
  'yearly',
]);
export const checkoutSessionStatusEnum = pgEnum('checkout_session_status', [
  'pending',
  'completed',
]);
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'open',
  'paid',
  'void',
  'uncollectible',
]);
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'succeeded',
  'failed',
  'canceled',
  'requires_action',
]);
export const verificationStatusEnum = pgEnum('verification_status', [
  'pending',
  'verified',
  'failed',
]);
export const connectionStatusEnum = pgEnum('connection_status', [
  'pending',
  'active',
  'error',
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email').unique().notNull(),
  name: varchar('name'),
  emailVerified: timestamp('emailVerified'),
  image: varchar('image'),
  timezone: varchar('timezone').default('UTC'),

  // Authentication
  passwordHash: varchar('password_hash'),

  // OAuth provider IDs (NextAuth.js compatible)
  googleId: varchar('google_id'),
  facebookId: varchar('facebook_id'),
  linkedinId: varchar('linkedin_id'),
  twitterId: varchar('twitter_id'),

  // Billing
  billingEmail: varchar('billing_email'),

  // User metadata
  isActive: boolean('is_active').default(true),

  // Onboarding fields - stored as individual columns for easier access
  // Step 1: Use Cases
  useCases: text('use_cases').array(), // Array of use case IDs
  otherUseCase: text('other_use_case'),

  // Step 2: Workspace Info (professional info)
  professionalRole: varchar('professional_role'),
  otherProfessionalRole: varchar('other_professional_role'),
  companySize: varchar('company_size'),
  industry: varchar('industry'),
  otherIndustry: varchar('other_industry'),

  // Step 3: CMS Integration
  cmsIntegration: varchar('cms_integration'),
  otherCms: text('other_cms'),

  // Step 5: Discovery (was Step 4)
  discoverySource: varchar('discovery_source'),
  otherDiscoverySource: varchar('other_discovery_source'),
  previousAttempts: text('previous_attempts'),

  // Onboarding tracking
  onboardingCurrentStep: integer('onboarding_current_step').default(1), // Start at step 1
  onboardingCompleted: boolean('onboarding_completed').default(false),
  onboardingCompletedAt: timestamp('onboarding_completed_at'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Subscriptions (billing entity)
// Plans table - source of truth for all plan details
export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Stripe integration
  stripeProductId: varchar('stripe_product_id').notNull(),
  stripePriceId: varchar('stripe_price_id').notNull(),
  stripePaymentLink: varchar('stripe_payment_link'),

  // Plan details
  name: varchar('name').notNull(), // Starter, Growth, Agency
  description: text('description'),
  price: integer('price').notNull(), // in cents
  frequency: billingFrequencyEnum('frequency').notNull(),
  level: integer('level').notNull(), // 1, 2, 3 for upgrade/downgrade logic
  isRecommended: boolean('is_recommended').default(false).notNull(),

  // Features and limits
  features: text('features').array(), // Array of feature strings
  maxNbOfCredits: integer('max_nb_of_credits').notNull(),
  maxNbOfPages: integer('max_nb_of_pages').notNull(),
  maxNbOfSeats: integer('max_nb_of_seats').notNull(),
  maxNbOfSites: integer('max_nb_of_sites').notNull(),
  whiteLabelEnabled: boolean('white_label_enabled').default(false).notNull(),

  // Usage-based billing
  overageRatePerPage: integer('overage_rate_per_page'), // in cents, null if no overage allowed

  // Status
  isActive: boolean('is_active').default(true).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Checkout sessions for secure signup flow
export const checkoutSessions = pgTable('checkout_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Stripe session info
  stripeSessionId: varchar('stripe_session_id').unique().notNull(),
  email: varchar('email').notNull(),
  planId: uuid('plan_id')
    .notNull()
    .references(() => plans.id),

  // Security token
  signupToken: varchar('signup_token').unique().notNull(),
  status: checkoutSessionStatusEnum('status').default('pending').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Updated subscriptions table
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  planId: uuid('plan_id')
    .notNull()
    .references(() => plans.id),

  // Stripe billing
  stripeCustomerId: varchar('stripe_customer_id'),
  stripeSubscriptionId: varchar('stripe_subscription_id'),
  status: subscriptionStatusEnum('status').default('trialing').notNull(),

  // Billing periods
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
  trialEndsAt: timestamp('trial_ends_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Team members (count against subscription limits)
export const teamMembers = pgTable('team_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id), // plan owner
  memberUserId: uuid('member_user_id').references(() => users.id), // team member - nullable for pending invitations
  invitedBy: uuid('invited_by')
    .notNull()
    .references(() => users.id),
  role: roleEnum('role').notNull(),
  status: statusEnum('status').default('pending').notNull(),

  invitedAt: timestamp('invited_at').defaultNow().notNull(),
  joinedAt: timestamp('joined_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Team invitations
export const teamInvitations = pgTable('team_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  token: varchar('token').notNull().unique(),
  email: varchar('email').notNull(),
  teamMemberId: uuid('team_member_id')
    .notNull()
    .references(() => teamMembers.id),
  expiresAt: timestamp('expires_at').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Client invitations (for workspace client members)
export const clientInvitations = pgTable('client_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  token: varchar('token').notNull().unique(),
  email: varchar('email').notNull(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  invitedBy: uuid('invited_by')
    .notNull()
    .references(() => users.id),
  role: clientRoleEnum('role').notNull(),
  expiresAt: timestamp('expires_at').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// White label branding (shared across all workspaces)
export const whiteLabelBrandings = pgTable('white_label_brandings', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id)
    .unique(), // one branding per organization
  organizationName: varchar('organization_name').notNull(),
  logoUrl: varchar('logo_url'),
  brandColors: json('brand_colors'), // {primary: "#...", secondary: "#..."}
  customCss: text('custom_css'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Workspaces
export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name').notNull(), // "Nike Main Site"
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),

  // White labeling (Agency/Enterprise plans only)
  whiteLabelEnabled: boolean('white_label_enabled').default(false).notNull(),
  whiteLabelBrandingId: uuid('white_label_branding_id').references(
    () => whiteLabelBrandings.id
  ),
  customDomain: varchar('custom_domain'), // "nike.agencyname.com"

  // Soft delete (30-day recovery)
  deletedAt: timestamp('deleted_at'),
  deletedBy: uuid('deleted_by').references(() => users.id),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Connections (1:1 with workspaces)
export const connections = pgTable('connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id)
    .unique(), // 1:1 relationship
  connectionUrl: varchar('connection_url').notNull().unique(), // "nike.com" or database connection string

  // Connection details
  connectionType: connectionTypeEnum('connection_type').notNull(),
  status: connectionStatusEnum('status').default('pending').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// CMS-specific connection details
export const connectionCms = pgTable('connection_cms', {
  id: uuid('id').defaultRandom().primaryKey(),
  connectionId: uuid('connection_id')
    .notNull()
    .references(() => connections.id, { onDelete: 'cascade' })
    .unique(), // 1:1 with connection

  // API credentials
  apiUsername: varchar('api_username'),
  encryptedApiToken: text('encrypted_api_token'),
  cmsSiteId: varchar('cms_site_id'),

  // Sync status
  lastSyncAt: timestamp('last_sync_at'),
  lastSyncError: text('last_sync_error'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Hosted-specific connection details
export const connectionHosted = pgTable('connection_hosted', {
  id: uuid('id').defaultRandom().primaryKey(),
  connectionId: uuid('connection_id')
    .notNull()
    .references(() => connections.id, { onDelete: 'cascade' })
    .unique(), // 1:1 with connection

  // Verification
  verificationToken: varchar('verification_token'),
  verificationMethod: varchar('verification_method').default('DNS'),
  verifiedAt: timestamp('verified_at'),

  // CDN and SSL
  cdnConfig: json('cdn_config'), // CloudFront settings, etc.
  sslCertificateId: varchar('ssl_certificate_id'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Client members (unlimited, white-labeled workspaces only)
export const workspaceClientMembers = pgTable('workspace_client_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  invitedBy: uuid('invited_by')
    .notNull()
    .references(() => users.id),
  role: clientRoleEnum('role').notNull(),
  status: statusEnum('status').default('pending').notNull(),

  invitedAt: timestamp('invited_at').defaultNow().notNull(),
  joinedAt: timestamp('joined_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Usage tracking per workspace
export const workspaceUsage = pgTable('workspace_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  pagesCount: integer('pages_published_count').default(0).notNull(),
  wordsCount: bigint('words_count', { mode: 'number' }).default(0).notNull(),
  lastCalculatedAt: timestamp('last_calculated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Invoices
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  subscriptionId: uuid('subscription_id')
    .notNull()
    .references(() => subscriptions.id),
  stripeInvoiceId: varchar('stripe_invoice_id').unique(),

  // Invoice details
  status: invoiceStatusEnum('status').notNull(),
  amountTotal: decimal('amount_total', { precision: 10, scale: 2 }).notNull(),
  amountPaid: decimal('amount_paid', { precision: 10, scale: 2 })
    .default('0')
    .notNull(),
  currency: varchar('currency').default('usd').notNull(),

  // Period
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),

  // Stripe details
  invoiceUrl: varchar('invoice_url'),
  pdfUrl: varchar('pdf_url'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Payments
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoices.id),
  stripePaymentIntentId: varchar('stripe_payment_intent_id').unique(),

  // Payment details
  status: paymentStatusEnum('status').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency').default('usd').notNull(),

  // Payment method
  paymentMethodType: varchar('payment_method_type'), // 'card', 'bank_account', etc
  last4: varchar('last4'),
  brand: varchar('brand'),

  // Stripe details
  stripeChargeId: varchar('stripe_charge_id'),
  failureReason: text('failure_reason'),

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
    expires_at: bigint('expires_at', { mode: 'number' }),
    token_type: varchar('token_type'),
    scope: varchar('scope'),
    id_token: text('id_token'),
    session_state: varchar('session_state'),
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
    type: varchar('type').default('password_reset'), // Type of verification token
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  vt => ({
    compoundKey: primaryKey({
      columns: [vt.identifier, vt.token],
    }),
  })
);
