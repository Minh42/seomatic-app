# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product Overview

**SEOmatic** is a SaaS platform for programmatic SEO (pSEO) targeting SEO agencies, in-house SEO managers, and SMB marketers. The product provides end-to-end infrastructure for creating, optimizing, publishing, monitoring, and reporting on thousands of SEO pages at scale.

For complete product requirements, feature roadmap, and business objectives, see [PRD.md](./PRD.md).

## Commands

### Development

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server

### Code Quality

- `pnpm lint` - Run ESLint with auto-fix
- `pnpm lint:check` - Run ESLint without fixing
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check Prettier formatting

### Package Management

- Uses `pnpm` as package manager (specified in package.json)

## Tech Stack

- **Frontend:** Next.js 15 with App Router, React 19, TypeScript
- **Styling:** Tailwind 4, shadcn/ui design system
- **Database:** AWS RDS (PostgreSQL) with Drizzle ORM/query builder
- **Caching:** Upstash Redis for fast data access
- **File Storage:** AWS S3 with CloudFront CDN for global asset delivery
- **State Management:** TanStack for server state management and data fetching
- **Authentication:** NextAuth.js for OAuth and session management
- **Payments:** Stripe for payment processing and subscription management
- **Email:** Bento API for email automation and transactional emails
- **Analytics:** PostHog for in-app product analytics and user tracking
- **Forms:** TanStack Form for form management and validation
- **Validation:** Zod for schema validation and type safety
- **Hosting:** Vercel for application deployment

## Architecture Overview

This is a **multi-tenant SaaS application** built with Next.js 15 that uses **subdomain-based routing** to serve different tenants. Each tenant gets their own subdomain with custom branding.

### Core Multi-Tenant Architecture

**Subdomain Routing Flow:**

1. `middleware.ts` intercepts all requests and extracts subdomain using `extractSubdomain()`
2. For subdomains: rewrites `/` to `/s/[subdomain]` to serve tenant-specific content
3. For root domain: serves main site and admin panel
4. Admin panel is blocked from subdomain access for security

**Environment Detection:**

- **Local:** `tenant.localhost:3000` format
- **Production:** `tenant.yourdomain.com` format
- **Vercel Preview:** `tenant---branch-name.vercel.app` format (special handling for preview deployments)

### Data Storage Pattern

**Primary Database (AWS RDS PostgreSQL):**

- Managed with Drizzle ORM for type-safe schema and migrations
- Main application data storage

**Redis Cache (Upstash):**

- Currently used for tenant storage with key pattern: `subdomain:{tenant-name}`
- Each tenant has: `{ emoji: string, createdAt: number }`
- Functions in `lib/subdomains.ts`:
  - `getSubdomainData(subdomain)` - Fetch single tenant
  - `getAllSubdomains()` - Fetch all tenants for admin
  - `isValidIcon()` - Validate emoji icons

**File Storage (AWS S3):**

- Static assets and user uploads stored in S3
- Delivered globally via CloudFront CDN for optimal performance

### Key Files & Responsibilities

- **`middleware.ts`** - Handles subdomain detection and routing logic across environments
- **`lib/subdomains.ts`** - All tenant data management and validation
- **`lib/redis.ts`** - Upstash Redis connection setup
- **`lib/utils.ts`** - Environment constants (`protocol`, `rootDomain`)
- **`app/s/[subdomain]/page.tsx`** - Dynamic tenant page template
- **`app/actions.ts`** - Server actions for CRUD operations on tenants
- **`app/admin/page.tsx`** - Admin dashboard for managing all tenants

### Environment Variables Required

```
# Redis (Upstash)
KV_REST_API_URL=your_upstash_redis_url
KV_REST_API_TOKEN=your_upstash_redis_token

# Database (AWS RDS PostgreSQL)
# Development
DATABASE_URL=postgresql://username:password@dev-host:5432/seomatic_dev
# Production
# DATABASE_URL=postgresql://username:password@prod-host:5432/seomatic_prod

# AWS S3 & CloudFront
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET_NAME=your_s3_bucket
CLOUDFRONT_DOMAIN=your_cloudfront_domain

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Application
NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com  # Optional, defaults to localhost:3000
```

### Development Notes

- **Database:** PostgreSQL with Drizzle ORM for type-safe queries and migrations
- **State Management:** TanStack Query handles server state, caching, and data fetching
- **File Uploads:** AWS S3 integration with CloudFront for optimized global delivery
- **Payments:** Hybrid subscription + usage-based pricing model tracking pages published
- Server actions handle form submissions and database operations
- Path alias `@/*` points to root directory
- No authentication is implemented (marked as TODO in admin)
- Subdomain validation sanitizes input to alphanumeric + hyphens only
- **NEVER add fallbacks and fake data** - maintain data integrity

### Code Style Guidelines

- **Use ES modules syntax:** `import/export`, not CommonJS `require`
- **Destructure imports:** `import { foo } from 'bar'` when possible
- **Pre-commit hooks:** Configured with husky + lint-staged to automatically lint and format before commits

### Refactoring Guidelines

**Only extract components/files when:**

1. **Reused** in multiple places
2. **Complex enough** to warrant separation (>100-150 lines)
3. **Different concerns** (UI vs logic vs data)

**Avoid over-refactoring:**

- Don't create unnecessary abstraction layers (e.g., `PageClient` components that aren't reused)
- Keep related logic together - a single page/feature should live in one file unless there's a compelling reason to split
- Prefer co-location over premature separation
- File splitting should solve real problems, not create imaginary ones

**Good extractions:**

- Reusable UI components (`Button`, `Input`, `Modal`)
- Shared business logic hooks (`useAuthForm`, `useCountAnimation`)
- Utility functions used across modules
- Complex forms with validation (when reused)

**Bad extractions:**

- Page-specific components that aren't reused elsewhere
- Single-use "Client" wrapper components
- Breaking apart cohesive units for organizational aesthetics

### Deployment Considerations

- Designed for Vercel deployment
- Requires wildcard DNS setup (`*.yourdomain.com`) for custom domains
- Middleware config excludes `/api`, `/_next`, and static files from processing
- Uses Vercel Analytics and Speed Insights for monitoring
