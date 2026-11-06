# Design Spec 11 — Public Landing Site & Search Discoverability

**Companion to:** Design-Spec-00-Foundations.md (§2 Information Architecture)
**Status:** Approved by owner (requirement raised 2026-10-19)

---

## 1. Problem
All meaningful content of FinFamily lives behind sign-in inside a client-rendered SPA. A search-engine crawler only ever sees the empty `<div id="root">` and the login screen, so the product is not indexed by Google.

## 2. Solution Overview
Serve a **static, crawlable, JavaScript-free marketing page at `/`** and keep the authenticated SPA on every other route.

| Concern | Decision |
|---|---|
| Landing page | Hand-authored static `frontend/index.html` (semantic HTML + inline CSS, no JS required). No new framework (Next.js etc. stays forbidden by AGENTS.md §3). |
| SPA shell | Moved to `frontend/app.html` (entry `src/main.tsx`). Carries `<meta name="robots" content="noindex">` so only the landing page competes in search results. |
| Routing (prod) | `vercel.json`: `/api/*` → API; any non-file path (`/login`, `/dashboard`, …) → `/app.html`. `/` resolves to the static landing file. |
| Routing (dev) | Small Vite plugin rewrites non-asset, non-root requests to `/app.html`. |
| Top-right actions | **Sign in** → `/login`, **Sign up** → `/register` (primary button). |
| Config | Canonical origin comes from `VITE_SITE_URL`; optional Search Console token from `VITE_GOOGLE_SITE_VERIFICATION`. Nothing environment-specific is hard-coded. |

## 3. Page Structure (single scroll page)
1. **Header** (sticky): logo + wordmark · anchor links *Features / Apps / FAQ* (hidden < 640px) · **Sign in** (ghost) · **Sign up** (filled).
2. **Hero**: H1, one-sentence value proposition, primary CTA *Create free account*, secondary *Sign in*, product screenshot (`/dashboard-preview.jpg`, explicit width/height, descriptive alt).
3. **Features** (6 cards): Net-worth dashboard · Loans & EMI engine (incl. gold loans) · Debt-payoff strategies (+AI suggestions) · Income & expense tracking · Unified transaction statement · Insurance & audit trail with member roles.
4. **Apps** (1 card): FinFamily, including Projects under Expenses. FairShare was retired 2026-11-06.
5. **How it works** (3 steps): Create a family → Add assets, income, loans → See the full picture.
6. **FAQ** (native `<details>`): matches the FAQPage JSON-LD exactly.
7. **Closing CTA** + **Footer** (Sign in, Sign up, © year).

Only claims that exist in the product are made — no fabricated testimonials, ratings or user counts.

## 4. SEO Requirements
- `<title>` ≤ 60 chars, meta description 120–160 chars, `lang="en"`, canonical URL, `theme-color`.
- Open Graph + Twitter Card tags with `/og-image.jpg` (1200×630).
- JSON-LD: `SoftwareApplication` (FinanceApplication, free offer), `Organization`/`WebSite`, `FAQPage`.
- One `<h1>`, ordered heading hierarchy, landmark elements (`header`, `main`, `section`, `footer`, `nav`).
- `/robots.txt` and `/sitemap.xml` generated at build time from `VITE_SITE_URL`.
- Performance: no render-blocking JS, system-font fallback with `font-display: swap` Inter, hero image sized to avoid layout shift, lazy-load below-the-fold imagery.
- Accessibility: skip link, visible focus rings, ≥ 4.5:1 contrast in light and dark (`prefers-color-scheme`), 44px tap targets, `prefers-reduced-motion` respected.
- Responsive: mobile-first, verified at 360 / 768 / 1280px (AGENTS.md §9 responsiveness guardrail).

## 5. Owner Actions After Deploy (cannot be automated)
1. Set `VITE_SITE_URL` (e.g. `https://your-domain`) in the hosting environment and redeploy.
2. Add the site in **Google Search Console**, verify ownership (DNS, or set `VITE_GOOGLE_SITE_VERIFICATION`), submit `/sitemap.xml`, then *Request indexing* for `/`.
3. Indexing typically takes days to weeks; ranking for generic terms depends on content, backlinks and domain age.

## Redesign v2 — Debt-planner positioning (added 2026-10-19, pending owner approval)
- **Selling point:** the hero leads with the debt-payoff planner ("Too many loans? Know exactly which one to close first.") and the AI advisor (Google Gemini, on-demand on the Debt Strategies page). An announcement bar above the header carries the same message with a *Try the debt planner* link.
- **Interactive planner (client-side only):** three illustrative loans, an Avalanche/Snowball toggle and an "extra per month" slider run a month-by-month simulation in the browser (minimum-only vs. roll-over plan) and show months to debt-free, months saved, interest saved, which loan to "Close first", and an AI-advisor-style sentence. It is labelled as an example and uses no user data or network calls.
- **Bento feature grid** (debt strategies and AI advisor as the two large cards), a "Private by design" section (no account numbers, lender optional, no bank connection), product-screen tabs, the two-app section (FinFamily with Household + Projects, and FairShare), a project funding example, how-it-works, a redesigned FAQ and CTA band.
- **Auth slide-over:** Sign in / Sign up (header, hero, FAQ, CTA, footer) open a right-hand drawer on the static page instead of navigating. Forms post to `POST {VITE_API_URL}/auth/login` and `/auth/register` with credentials (the refresh cookie), then redirect to `/dashboard` or `/onboarding/family-selection`; the SPA restores the session from the cookie. The `href`s still point to `/login` and `/register` (no-JS and crawler fallback), and `#signin` / `#signup` deep-link the drawer. Accessibility: `role=dialog`, focus trap, Esc to close, focus restore, page `inert` while open.
- Motion respects `prefers-reduced-motion`; dark and light themes are token-driven.

