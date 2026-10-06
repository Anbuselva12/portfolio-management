# AGENTS.md — FinFamily Agent Guardrails

This file defines the rules every AI agent or code-generation tool **must follow** when working on this codebase. Read this file before touching any code.

---

## 1. Ask Before You Act

> **If you are unsure about anything — requirements, design intent, naming, trade-offs, edge cases — STOP and ask the owner (Anbu) before writing or modifying any code.**

This applies to:
- Ambiguous or conflicting requirements between the SDD and Design Specs
- Any decision not explicitly covered by the documents
- Technology or library choices not listed in the approved stack (§3)
- Data model changes, schema additions, or new fields not described in the SDD
- Assumptions about business logic (e.g., rounding behaviour, edge-case EMI scenarios)
- UI layout or interaction patterns not specified in the Design Specs

**Do not guess. Do not silently pick a path. Ask first, code second.**

### Documentation-First for Requirement Changes (MANDATORY)
> **If the owner (Anbu) requests new features, scope adjustments, or behavioural changes that are not present in or require modifying the requirement/design documents (Core SDD, Design Specs, or Execution Stories):**
> 1. **STOP and update the respective documentation first** (Core SDD, Design Specs, Execution Stories) to formally reflect the new requirements, data models, formulas, and UI flows.
> 2. **Only after the documentation is updated**, proceed to implement the changes in code.
> 3. Never implement code changes that deviate from or add to the specification without first updating the source-of-truth documents.

---

## 2. Source-of-Truth Documents

Always consult these documents before implementing any feature. They are the authoritative source of truth:

| Document | Path |
|---|---|
| Core SDD | `docs/Core SDD/SDD-Family-Wealth-Manager.md` |
| Foundations & Design System | `docs/Design Specs/Design-Spec-00-Foundations.md` |
| Auth & Family Onboarding | `docs/Design Specs/Design-Spec-01-Auth-Family-Onboarding.md` |
| Dashboard | `docs/Design Specs/Design-Spec-02-Dashboard.md` |
| Assets & Income | `docs/Design Specs/Design-Spec-03-Assets-Income.md` |
| Loans & Repayment | `docs/Design Specs/Design-Spec-04-Loans-Repayment.md` |
| Debt Strategy Comparison | `docs/Design Specs/Design-Spec-05-Debt-Strategy-Comparison.md` |
| Expenses & Insurance | `docs/Design Specs/Design-Spec-06-Expenses-Insurance.md` |
| Admin, Audit & Settings | `docs/Design Specs/Design-Spec-07-Admin-Audit-Settings.md` |
| Story 1 | `docs/Execution Stories/Story-1-Foundation-Family-Onboarding-Portfolio.md` |
| Story 2 | `docs/Execution Stories/Story-2-Loan-Engine-Dashboard.md` |
| Story 3 | `docs/Execution Stories/Story-3-Debt-Strategy-AI-Audit-Launch.md` |

If any of the above documents conflict with each other, **ask the owner** to clarify before proceeding.

---

## 3. Approved Tech Stack — Do Not Deviate Without Approval

The following stack is locked. Do **not** introduce any library, framework, or tool that is not listed here without explicit approval from the owner.

### Frontend
| Concern | Approved Choice |
|---|---|
| Framework | **React 18** + **TypeScript** |
| Build tool | **Vite** |
| State management | **Zustand** ✅ confirmed |
| Charts | **Recharts** (primary) + **D3** (custom Gantt/debt-payoff timeline only) |
| Styling | **Tailwind CSS** ✅ confirmed |
| HTTP client | **Axios** ✅ confirmed |

### Backend
| Concern | Approved Choice |
|---|---|
| Runtime | **Node.js** |
| Framework | **NestJS** (TypeScript end-to-end) |
| ORM | **Prisma** (supports Postgres / MySQL / SQLite via single schema) |
| Auth | **JWT** (access token 15 min + refresh token 7 days, HttpOnly cookie) |
| Password hashing | **bcrypt**, cost factor ≥ 12 |
| Scheduler | **node-cron** (in-process) |
| AI / LLM | **Google Gemini API** only (`gemini-2.x` or as configured in `.env`) |

### Infrastructure
| Concern | Approved Choice |
|---|---|
| Local/dev storage | Browser **LocalStorage** (via `LocalStorageRepository`) OR **SQLite** |
| Production DB | **PostgreSQL** (primary), MySQL/SQLite also supported via Prisma |
| Containerisation | **Docker** |
| Deployment target | Render / Railway / Fly.io / AWS / Azure / self-host (all valid) |

### Explicitly Forbidden
- **No floating-point arithmetic** for any monetary calculations — use fixed-point / Decimal libraries (e.g., `decimal.js` or Prisma's `Decimal` type).
- **No direct Gemini API calls from the frontend** — all AI calls must be proxied through the backend.
- **No hardcoded secrets** — all secrets (`JWT_SECRET`, `GEMINI_API_KEY`, DB credentials) must come from `.env` and never be committed to the repository.
- **No new frameworks** (e.g., Next.js, SvelteKit, Express replacing NestJS) without explicit owner approval.
- **No direct connections to production databases (Neon) or hosting platforms (Vercel)** from local agent sessions or scripts. Agents must NEVER configure, connect to, or execute commands against production database URLs (e.g., `*.neon.tech`). Production data access and migrations are strictly isolated to Vercel/Neon runtime directly. Local development must strictly use local storage / SQLite.

---

## 4. Architecture Rules

- **Repository Pattern is mandatory.** All data access goes through a repository interface. Business logic must never reference LocalStorage or a specific ORM directly — it only talks to the interface.
- **Storage-mode parity is mandatory.** The same business-logic test suite must pass identically against the LocalStorage adapter and the real DB driver. Never write business logic that branches on `STORAGE_MODE`.
- **No hard deletes in server mode.** Every financial entity uses soft delete (`deleted_at` timestamp). Only use hard delete in test fixtures.
- **Schedule regeneration is always full, never incremental.** When a loan's terms change, regenerate the entire future schedule from the next unpaid installment. Never patch individual rows silently.
- **Audit log is non-negotiable.** Every create / update / soft-delete / restore / login / password-reset must produce an `AuditLogEntry` with before/after field diffs. Do not skip audit logging for "minor" changes.

---

## 5. Financial Calculation Rules

- Use the exact formulas specified in SDD §7. Do not approximate or substitute alternative formulas.
- EMI (compound): `EMI = P × r × (1 + r)^n / ((1 + r)^n − 1)`
- EMI (simple/flat): `EMI = (P + P×R×T) / n`
- Prepayment reduce-tenure: `n' = -ln(1 − (r × (P−X)) / EMI) / ln(1 + r)`
- EMI reconciliation tolerance: configurable, default **1%**. Outside tolerance → Newton-Raphson implied-rate solver, DiscrepancyBanner, default to implied_rate.
- All monetary values stored and calculated as **Decimal**, never `float` or `number` for amounts.
- Country rule set must be **snapshotted onto the Loan at creation** — a later change to the Family's country must never retroactively alter existing loans.

---

## 6. Security Rules

- All financial API routes must verify the JWT **and** confirm the requesting member belongs to the same `family_id` as the requested resource. Cross-family data access is a critical security boundary.
- A `pending_approval` member must be blocked from all financial endpoints — not just the UI.
- The Gemini API key (`GEMINI_API_KEY`) must never appear in any frontend bundle, log output, or API response.
- Refresh tokens must be stored in **HttpOnly** cookies — never in `localStorage`.

### Production Environment Isolation (STRICT GUARDRAIL)
- **Zero direct connections to Neon PostgreSQL or Vercel production environments:** AI agents, code generators, and local development tools must NEVER directly connect to, query, migrate, seed, or manipulate the production Neon database or Vercel production environment from the local shell, scripts, or codebase.
- **Owner-Exclusive Production Management:** All production database updates (migrations, schema changes, DDL, data seeding) must be executed by the owner (Anbu) directly through the Neon console or Vercel platform.
- **Strict Local Isolation:** Local development, scripts, and tests must strictly run against the local SQLite database (`dev.db` / `test.db`) or `LocalStorage`.
- **Zero Production Credentials in Workspace:** Production credentials, connection strings (e.g., `*.neon.tech`), and Vercel tokens must NEVER be placed in `.env`, shell session variables, or committed to code.

---

## 7. Scope Guardrails — What NOT to Build

The following are explicitly **out of scope for v1**. Do not implement them even if they seem like easy wins:

- Bank / CSV / PDF statement import
- Budget limits or alerts per expense category
- Automated FX rate sync (manual rate table only in v1)
- Push / SMS / email notifications or reminders
- Goal-based savings tracking
- Mobile app (React Native or otherwise)
- Countries beyond India
- Invite-code / link-based family joining
- Investment analytics (XIRR / CAGR)

If a user story or feature request touches any of the above, **flag it to the owner** before building anything.

---

## 8. Story Sequencing — Do Not Skip Ahead

Features must be built in story order. Do not implement Story 2 items while Story 1 is incomplete, and do not implement Story 3 items while Story 2 is incomplete, unless the owner explicitly approves an exception.

| Story | Key Theme | Must-complete before next |
|---|---|---|
| Story 1 | Auth + Family Onboarding + Portfolio data (Assets/Income/Expenses/Insurance) + Dashboard KPI strip | ✅ All Story 1 DoD criteria met |
| Story 2 | Loan Engine + Repayment Schedule + Prepayment Calculator + Full Dashboard charts | ✅ All Story 2 DoD criteria met |
| Story 3 | Debt Strategy Engine + AI Suggestions + Audit Trail + Multi-currency + Deployment | ✅ All Story 3 DoD criteria met |

---

## 9. Code Quality Standards

- TypeScript **strict mode** enabled — no `any` types without a justified comment.
- All public service methods and repository interface methods must have JSDoc comments explaining their contract.
- All financial calculation functions must have **unit tests** against known reference values (published amortization tables or manually verified examples).
- No `console.log` in production code — use a structured logger.
- Environment variables must be validated at startup (e.g., via `class-validator` + NestJS `ConfigModule`) — the app must fail fast with a clear error if required env vars are missing.

---

## 10. Interaction Protocol (for AI Agents)

1. **Before starting a story or sub-task**, confirm with the owner which story and which sub-tasks are in scope for this session.
2. **Before creating any new file or module**, state what you are about to create and why, and wait for a go-ahead if there is any uncertainty.
3. **When you encounter a gap** (something the docs don't specify), list your options with trade-offs and ask the owner to choose — do not silently pick one.
4. **After completing a sub-task**, summarise what was built and explicitly list any assumptions made, so the owner can verify or correct them.
5. **Never output a large block of code speculatively** ("here's what I think it might look like") — only output code that has been confirmed against the spec and approved scope.
6. **Update documentation before implementing requested requirement changes**: When the owner asks for new capabilities or modifications not in the specs, update the relevant files in `docs/` first before touching code.

