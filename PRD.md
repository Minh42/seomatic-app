# Product Requirement Document (PRD)

**Product Name:** SEOmatic  
**Type:** SaaS – Programmatic SEO  
**Audience:** SEO agencies, in-house SEO managers, SMB marketers

## 1. Vision

To become the #1 platform for building, publishing, and managing programmatic SEO (pSEO) at scale. Unlike AI text generators or "prompt + CMS" workflows, this product provides end-to-end infrastructure: page creation, optimization, publishing, monitoring, and client reporting.

**The moat:** Not just generating pages, but owning the SEO lifecycle (creation → monitoring → reporting → ROI).

## 2. Objectives

- Reduce time to launch 1,000s of SEO pages from months → hours
- Provide agencies tools to prove ROI and retain clients
- Create switching costs via integrations, reporting, and data gravity
- Ensure product scalability for SMBs and agencies

## 3. Success Metrics (KPIs)

- Trial → Paid conversion ≥ 15%
- Retention ≥ 70% after 6 months
- Avg. # of pages published per client ≥ 5,000 (agencies)
- 50%+ agencies actively using white-label reports
- Gross margin ≥ 70% (BYO API keys, infra efficiency)
- Agencies using ≥ 3 client workspaces

## 4. User Personas

**SEO Freelancer / SMB Marketer:** Wants quick, cheap SEO wins. Limited budget, single domain, fast experimentation.

**In-House SEO Manager:** Works at SaaS/E-com. Needs 1,000s of local/comparison/integration pages. Demands analytics + reporting.

**Agency Owner:** Runs SEO for 10+ clients. Needs to scale pSEO while white-labeling to clients. Wants reporting, client portals, ROI calculators.

## 5. Feature Requirements

Below is the comprehensive feature list with explanations.

### Phase 1: Data & Templates

- Keyword Research
- Dynamic Variables / Fields
- Templates (including AI-generated templates)
- Data Import (CSV, Google Sheets, Airtable, Notion)
- Two-way Data Syncs
- Conditional Logic (if/then rules, hide empty variables)
- Data Library (centralized reusable datasets)

### Phase 2: AI Content & Media

- AI Content Generation
- AI Image Generation
- Dynamic OG Image Generation (Open Graph / social share images)
- Content Quality / Uniqueness Tools:
  - Spin syntax
  - Thin/duplicate content checker
  - Fact checker
  - Content optimization
  - E-E-A-T checker
  - Readability scoring
  - Brand voice tuning
  - Keyword cannibalization detector

### Phase 3: SEO Automation

- Meta Tags Automation (titles, descriptions, OG tags)
- Schema Markup (Product, FAQ, LocalBusiness, etc.)
- Internal Linking Automation
- Sitemap Generation
- Hub / Index Page Generator (directories, overviews)
- Content Refresh Automation (auto-update stale pages)
- Bulk Redirect Management (301s when deleting/merging)
- Bulk Editing & Bulk Deleting

### Phase 4: Publishing & Integrations

- CMS Integration (WordPress, Webflow, Shopify, Ghost, WooCommerce, Hubspot, SquareSpace, SQL databases)
- Export CSV / JSON
- Custom Domain Hosting
- Multi-language + Hreflang Automation (International SEO)
- Drip Publishing
- Zapier / n8n / Make Integrations
- Live Data & API Integrations (stock, pricing, feeds, CRMs)
- Bring Your Own API Key (for OpenAI, Claude, etc.)

### Phase 5: Analytics & Monitoring

- Indexing (Google Search Console integration)
- Ranking & Traffic Metrics (keywords, impressions, CTR, positions)
- Engagement & Conversion Metrics (Google Analytics integration)
- Page-Level SEO Audits & Alerts (missing H1, broken links, speed issues)

### Phase 6: Collaboration & Agency Tools

- Multi-client Workspaces
- Collaboration & Permissions (multi-user, roles)
- White-label Portal (custom domain, logo, client logins)
- White-label Reporting (PDF, scheduled email)
- Customer Reporting & Exports (PDF, CSV, automated email reports)
- Proposal Generator / ROI Calculator (client-facing pitch tool)
- Audit Imports (crawl client's site, suggest programmatic opportunities)
- Content Personalization Rules (show different content based on location/device/intent)
- Marketplace (Templates & Data Packs)

## 6. Defensive Moats

- **Data Gravity:** Saved templates, datasets, libraries
- **Client Deliverables:** Reports, portals → agencies can't churn without redoing workflow
- **Safeguards:** Index monitoring, refresh automation → continuous need
- **Ecosystem:** Template/data marketplace, benchmarking
- **Integrations:** Deep CMS + API pipelines = high switching cost

## 7. Anti-Churn Features

- **Indexation & Ranking Monitoring** → continuous value post-publishing
- **Content Refresh Automation** → recurring reason to stay
- **Client Reporting & White-label Portals** → agencies can't leave without disrupting deliverables
- **Data / Template Libraries** → agencies accumulate assets inside your tool
- **Custom Domain Hosting** → migration friction

## 8. Non-Functional Requirements

- **Performance:** Pages generated <2s; publishing <1 min per batch of 100 pages
- **Scalability:** Handle 50k+ pages per client
- **Security:** GDPR compliant, SSO for enterprise
- **Uptime:** 99.9% for hosted domains

## 9. Pricing Strategy (Aligned w/ Features)

- **Starter ($99):** 500 pages, 250k words, 1 domain. Overage: €0.25/page
- **Growth ($299):** 5k pages, 2.5M words, 3 domains + 1 hosted domain. Overage: €0.15/page
- **Agency ($699):** 20k pages, 10M words, 10 domains + 5 hosted domains. Overage: €0.05/page
- **Enterprise (Custom):** 50k+ pages, unlimited domains

### Trial Strategy

- No freemium (too many tyre kickers)
- 14-day free trial with hard caps (10 pages, 5k words)
