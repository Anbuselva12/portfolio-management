# Software Design Document (SDD)
## Family Wealth & Liability Manager ("FinFamily")

**Version:** 1.0
**Author:** Architect/BA (AI-assisted)
**Owner:** Anbu
**Date:** 2026-09-25

---

## 1. Introduction

### 1.1 Purpose
FinFamily is a personal/family finance web application that consolidates **assets, income, liabilities (loans), day-to-day expenses, and insurance policies** into a single **family-level financial portfolio**. It provides real-time KPIs, charts, and a **debt-repayment strategy engine** that recommends how to allocate surplus money across multiple loans, with the ability to compare strategies (Avalanche, Snowball, Custom-Weighted, AI-Suggested) side by side.

### 1.2 Scope
- In scope (v1): Family & user management, manual entry of assets/income/loans/expenses/insurance, automatic EMI/interest engine (simple & compound), prepayment "what-if" calculator, multi-strategy debt suggestion engine, dashboards/KPIs/charts, audit log, multi-currency, country-driven calculation rules, local-storage mode for local testing + pluggable real DB for deployment.
- Out of scope (v1, deferred to Future Scope §14): bank/CSV statement import, budgets/alerts on expense categories, editable recurring income beyond stop/edit, automated bank feeds, mobile apps, notifications/reminders (push/SMS/email), multi-family sharing beyond one family unit.

### 1.3 Definitions
| Term | Meaning |
|---|---|
| Family | The top-level tenant/accumulation unit. All portfolios roll up here. |
| Member | An individual user belonging to exactly one Family. |
| Admin | A Family Member with elevated rights (user management, password reset). |
| EMI | Equated Monthly Installment. |
| Avalanche | Repayment strategy: pay extra to the highest-interest-rate loan first. |
| Snowball | Repayment strategy: pay extra to the smallest-balance loan first. |
| Custom-Weighted | A configurable scoring strategy blending rate, balance, tenure, penalty, EMI flexibility. |
| Fixed EMI | Auto-debited every month; not skippable without penalty/default. |
| Flexible EMI | Payable at the member's discretion within the period (e.g., can be deferred and cleared later, subject to interest accrual rules). |

### 1.4 Actors
1. **Family Admin** — first user of a family; can create/deactivate members, reset passwords, has full CRUD on all family financial data.
2. **Family Member** — full CRUD on their own entries; read access to consolidated family portfolio (configurable — see §6.1).
3. **System (Scheduler)** — daily job that accrues interest, updates "current outstanding," and refreshes recurring income/expense occurrences.

---

## 2. System Architecture

### 2.1 Architectural Style
Layered web application: **SPA frontend** + **REST API backend** + **pluggable persistence layer**, so the same codebase runs against browser LocalStorage (local/dev/test) or a real database (production), selected purely by configuration — no code branching required in business logic.

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (SPA) — React + TypeScript                     │
│  - Auth screens, Dashboard, Assets, Loans, Expenses...    │
│  - Charting layer (Recharts/D3)                           │
│  - API client (Axios/Fetch) OR LocalStorage Adapter        │
└───────────────┬────────────────────────────────────────┘
                │ REST/JSON (HTTPS) — only when "server mode"
┌───────────────▼────────────────────────────────────────┐
│  Backend API — Node.js (NestJS) or Python (FastAPI)       │
│  - Auth & RBAC (JWT)                                      │
│  - Domain Services: Asset, Income, Loan, Expense,          │
│    Insurance, Suggestion Engine, Calculator, Audit         │
│  - Interest/EMI Calculation Engine (country-aware)          │
│  - Currency Conversion Service                             │
│  - Scheduler (cron) for daily accrual/recurrence            │
└───────────────┬────────────────────────────────────────┘
                │ Repository Interface (ORM-agnostic)
┌───────────────▼────────────────────────────────────────┐
│  Persistence Adapter (driven by .env: DB_DRIVER=...)       │
│  - sqlite (local file, zero-config)                        │
│  - postgres / mysql / mongodb (production)                 │
│  - LOCAL_ONLY mode: frontend talks to LocalStorage directly │
│    and skips backend entirely (pure static hosting mode)    │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Two Deployment Modes
1. **Local/Test Mode (`STORAGE_MODE=local`)**: Frontend runs standalone (e.g., `npm run dev` or static build), all data persisted in **browser LocalStorage** via a `LocalStorageRepository` that implements the same repository interface as the backend. No server required. Ideal for trying the app out, demos, offline use.
2. **Deployed/Production Mode (`STORAGE_MODE=server`)**: Frontend calls the backend REST API; backend persists via the configured real database, chosen entirely by `.env`:
   ```
   STORAGE_MODE=server
   DB_DRIVER=postgres        # postgres | mysql | sqlite | mongodb
   DB_HOST=...
   DB_PORT=...
   DB_NAME=finfamily
   DB_USER=...
   DB_PASSWORD=...
   JWT_SECRET=...
   DEFAULT_CURRENCY=INR
   DEFAULT_COUNTRY=IN
   ```
   Switching databases is a config change + running the ORM's migration set for that driver — no application code changes, because all data access goes through the Repository interface (Repository Pattern) and an ORM that supports multi-dialect SQL (e.g., TypeORM/Prisma for Node, SQLAlchemy for Python).

### 2.3 Recommended Tech Stack
| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Fast dev loop, strong typing for financial data, huge charting ecosystem |
| State Mgmt | Redux Toolkit / Zustand | Predictable state for portfolio aggregation across modules |
| Charts | Recharts (primary) + D3 (custom debt-payoff timeline) | Declarative, composable, good performance |
| Backend | Node.js + NestJS (TypeScript end-to-end) | Shared types/DTOs with frontend, strong modular architecture (matches domain services below), built-in dependency injection, guards for RBAC |
| ORM | Prisma | Multi-DB dialect support (Postgres/MySQL/SQLite) with one schema, easy migrations |
| Local Mode DB | SQLite (server) or browser LocalStorage (static) | Zero-config |
| Auth | JWT (access + refresh token), bcrypt password hashing | Stateless, scalable |
| Scheduler | node-cron (in-process) or a lightweight worker | Daily accrual jobs |
| Currency rates | Configurable static table + optional external FX API adapter (future) | v1 uses manually-set/periodically-updated rate table per family setting |

> **Note:** A Python/FastAPI + SQLAlchemy stack is an equally valid alternative if the team prefers Python; the domain design below is stack-agnostic.

### 2.4 Family/Portfolio Data Model Principle
All financial entities (Asset, Income, Loan, Expense, Insurance) are owned by a **Member** but scoped to a **Family** via a `family_id` foreign key. All aggregation queries (net worth, total liabilities, KPIs) run at the **Family** level by summing across all Members in that family, converted to the family's **base currency** at each entity's stored exchange rate (see §9).

---

## 3. Data Model

### 3.1 Entity-Relationship Overview
```
Family (1) ──< Member (N)
Family (1) ──< Currency/CountrySetting (1)
Member (1) ──< Asset (N)
Member (1) ──< IncomeEntry (N)
Member (1) ──< Loan (N) ──< LoanScheduleEntry (N)
Loan (1) ──< PrepaymentRecord (N)
Member (1) ──< ExpenseEntry (N)
Family (1) ──< ExpenseCategory (N)
Member (1) ──< InsurancePolicy (N)
Family (1) ──< AuditLogEntry (N)
Family (1) ──< SuggestionSnapshot (N)   [cached engine runs]
```

### 3.2 Core Entities

#### Family
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | string | e.g., "The Anbu Family" |
| base_currency | enum(ISO 4217) | e.g., INR |
| country | enum(ISO 3166) | drives loan calculation rule set (§7.5) |
| created_at | datetime | |

#### Member (User)
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| family_id | UUID | FK, **nullable** — null until the member creates or joins a family (see §4.1) |
| username | string | **globally unique** across the deployment (registration happens before family assignment, so uniqueness can't be scoped to a family the user doesn't have yet) |
| password_hash | string | bcrypt |
| display_name | string | |
| role | enum(admin, member) | admin only meaningful once family_id is set; the creator of a family is auto-promoted to admin for that family |
| status | enum(unaffiliated, pending_approval, active, deactivated) | see §4.1 for state transitions |
| is_active | boolean | derived/kept for query convenience; admin can deactivate instead of hard-delete |
| preferred_currency | enum | for display only; storage stays in family base currency + original entry currency |
| created_at, last_login_at | datetime | |

#### Family (additional fields for join workflow)
| Field | Type | Notes |
|---|---|---|
| join_policy | enum(open, approval_required) | **open**: a user who selects this family joins immediately as `active`. **approval_required** (default): user joins as `pending_approval`, an Admin must approve before the account becomes `active` and gains data access. |
| is_discoverable | boolean | if true, family appears in the "Join Existing Family" selection list for unaffiliated users; if false, joining requires an invite (future scope — v1 ships discoverable-list join only). |

#### Asset
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| member_id | UUID | FK |
| type | enum | bank_balance, fd, rd, mutual_fund, stocks, pf, nps, gold, real_estate, other |
| name | string | e.g., "HDFC FD #4521" |
| currency | enum | original currency of the value |
| current_value | decimal | manually updated |
| principal_invested | decimal | nullable — for gain/loss KPI |
| maturity_date | date | nullable (FD/RD/insurance-linked) |
| interest_rate | decimal | nullable — for FD/RD projected value |
| notes | text | |
| created_at, updated_at | datetime | |
| deleted_at | datetime | nullable — soft delete for audit trail |

#### IncomeEntry
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| member_id | UUID | FK |
| type | enum | salary, rent, dividend, interest, freelance, other |
| label | string | |
| amount | decimal | base scheduled/contracted monthly amount |
| currency | enum | |
| recurrence | enum | recurring_monthly, one_off |
| due_day_of_month | int | default 1 (or day of start_date) — expected date of arrival in month |
| reminders_enabled | boolean | default true — whether to queue into Dashboard Pending Reminders |
| start_date | date | |
| end_date | date | nullable — set when a recurring income is "stopped" |
| status | enum | active, stopped |
| last_amount_change_date | date | tracks e.g. "rent increased" edits (see 3.2.1) |
| created_at, updated_at, deleted_at | datetime | |

#### MonthlyIncomeReceipt (Monthly Actuals & Variance Log)
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| income_id | UUID | FK to IncomeEntry |
| family_id | UUID | FK to Family |
| member_id | UUID | FK to Member who confirmed |
| year_month | string | format YYYY-MM (e.g. "2026-09") |
| scheduled_amount | decimal | original expected amount from IncomeEntry |
| received_amount | decimal | actual amount received this month (user-confirmed or modified) |
| status | enum | pending, received, skipped |
| received_date | date | actual date confirmed/arrived |
| notes | string | nullable — reason for monthly discrepancy (e.g. "tenant partial payment") |
| created_at, updated_at | datetime | |

**3.2.1 Recurring Income Edit Semantics:** Editing the base contracted `amount` of an **active recurring** entry does not rewrite history — it closes the current entry (`end_date = edit_date - 1`, `status = superseded`) and creates a new IncomeEntry linked via `superseded_by_id`, preserving an accurate month-by-month income history for KPIs/trend charts. Editing a **one-off** entry is a direct in-place edit. Temporary monthly variances (e.g. late/partial rent, overtime salary) are recorded directly in `MonthlyIncomeReceipt` from the Dashboard reminders queue without altering the base recurring IncomeEntry contract.

#### Loan
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| member_id | UUID | FK |
| name | string | user-defined name/nickname, e.g. "Home Loan Top Up", "HDFC Primary" |
| place_or_purpose | string | nullable — property or purpose, e.g. "Chennai Home", "Plot #42" |
| comments | string | nullable — personal notes/comments for the user |
| loan_type | enum | home, car, personal, jewel, education, business, gold, other |
| lender_name | string | e.g. "HDFC Bank", "SBI" |
| currency | enum | |
| principal_amount | decimal | original sanctioned amount |
| interest_type | enum | simple, compound |
| interest_rate_annual | decimal | percentage |
| compounding_frequency | enum | monthly, quarterly, annually (only if compound) |
| tenure_months_total | int | |
| start_date | date | |
| emi_amount | decimal | nullable — if user inputs it directly (see §7.3 reconciliation) |
| emi_type | enum | fixed, flexible |
| current_outstanding_principal | decimal | system-maintained, recalculated on every schedule regen |
| remaining_tenure_months | int | system-maintained |
| prepayment_penalty_type | enum | none, flat_fee, percent_of_prepaid, percent_of_outstanding |
| prepayment_penalty_value | decimal | nullable |
| emi_reminders_enabled | boolean | default true — toggleable anytime to enable/disable auto-queuing into monthly expenses |
| status | enum | active, closed, defaulted |
| country_rule_set | enum | inherited from Family.country at creation; snapshotted so later country changes don't retroactively alter existing loans |
| created_at, updated_at, deleted_at | datetime | |

#### LoanScheduleEntry (Amortization row)
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| loan_id | UUID | FK |
| installment_number | int | |
| due_date | date | |
| opening_balance | decimal | |
| emi_amount | decimal | |
| principal_component | decimal | |
| interest_component | decimal | |
| closing_balance | decimal | |
| is_paid | boolean | |
| paid_date | date | nullable |
| is_extra_payment_applied | boolean | |
| edited_manually | boolean | flags a row corrected by the user, triggers audit entry |

> The full schedule is **regenerated** (not incrementally patched) whenever the loan's principal, rate, tenure, EMI, or a prepayment is added/edited/deleted — ensuring internal consistency. Regeneration preserves `is_paid`/`paid_date` for installments before "today" (treated as historical fact) and recalculates everything from the next unpaid installment forward.

#### PrepaymentRecord
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| loan_id | UUID | FK |
| amount | decimal | principal prepayment amount |
| date | date | execution date of the prepayment |
| mode_chosen | enum | reduce_tenure, reduce_emi |
| penalty_charged | decimal | computed prepayment penalty at time of entry |
| accrued_interest | decimal | broken-period simple interest charged by lender (e.g., ₹120 for days since last EMI) |
| total_paid | decimal | total cash outflow (`amount + penalty_charged + accrued_interest`) |
| notes | string | nullable — reason or lender payment reference |
| source | enum | manual, from_suggestion_engine | tags whether it followed an engine recommendation |

#### RateRevisionRecord (Floating-Rate Loans)
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| loan_id | UUID | FK |
| effective_date | date | date the new interest rate takes effect |
| old_interest_rate | decimal | annual rate before revision (%) |
| new_interest_rate | decimal | annual rate after revision (%) |
| action_mode | enum | `keep_emi` (contract/expand tenure), `keep_tenure` (recalculate EMI) |
| old_tenure_months | int | remaining tenure before revision |
| new_tenure_months | int | remaining tenure after revision |
| old_emi | decimal | monthly EMI before revision |
| new_emi | decimal | monthly EMI after revision |
| interest_saved | decimal | projected interest change over remaining loan life |
| notes | string | nullable — e.g. "RBI Repo rate cut / HDFC EBLR reset" |
| created_at | datetime | creation timestamp |

#### ExpenseCategory
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| family_id | UUID | FK — categories shared at family level so all members use consistent taxonomy |
| name | string | user-defined, e.g., "Gas", "Electricity", "Internet"; seeded with common defaults on family creation |
| icon/color | string | for UI |
| is_active | boolean | soft-disable instead of hard delete if in use |

#### ExpenseEntry
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| member_id | UUID | FK |
| category_id | UUID | FK |
| amount | decimal | |
| currency | enum | |
| date | date | |
| notes | string | |
| source | enum | `manual`, `insurance_auto`, `loan_emi_auto` |
| loan_id | UUID | nullable — FK to Loan when source = `loan_emi_auto` |
| installment_id | UUID | nullable — FK to RepaymentInstallment when source = `loan_emi_auto` |
| is_paid | boolean | default false in pending queue, true when marked paid |
| created_at, updated_at, deleted_at | datetime | |

#### InsurancePolicy
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| member_id | UUID | FK |
| policy_type | enum | life, health, vehicle, home, other |
| provider | string | |
| policy_number | string | |
| sum_assured | decimal | reference only — **not** included in net-worth asset total |
| premium_amount | decimal | |
| premium_frequency | enum | monthly, quarterly, annual |
| next_due_date | date | |
| linked_expense_category | UUID | FK to ExpenseCategory — premium due auto-generates/updates an ExpenseEntry each cycle |
| status | enum | active, lapsed, matured |

#### AuditLogEntry
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| family_id | UUID | FK |
| member_id | UUID | who performed the action |
| entity_type | string | Asset, Loan, Expense, Income, Insurance, Member, LoanScheduleEntry, etc. |
| entity_id | UUID | |
| action | enum | create, update, delete, restore, login, password_reset |
| field_changes | JSON | `{field: {old, new}}` |
| timestamp | datetime | |

#### SuggestionSnapshot
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| family_id | UUID | FK |
| generated_at | datetime | |
| available_surplus | decimal | input used |
| prepayment_mode | enum | one_off_lump_sum, recurring_monthly |
| strategies | JSON | array of {strategy_name, allocations[], projected_interest_saved, projected_debt_free_date} |
| user_choice | UUID/string | nullable — which strategy the user ultimately said they'd follow |

### 3.3 Reference/Config Data
- **CurrencyRate**: `{family_id, currency_code, rate_to_base, effective_date}` — manually maintained table (future: external API sync).
- **CountryLoanRuleSet**: `{country_code, loan_type, default_interest_method, day_count_convention, statutory_prepayment_penalty_cap, notes}` — see §7.5.

---

## 4. Functional Requirements

### 4.1 Family & User Management

**High-level workflow (detailed screens/wireframes in *Design-Spec-01-Auth-Family-Onboarding.md*):**
1. A new user **self-registers** with username + password only (no family required yet) → account created with `status = unaffiliated`.
2. On first login, an unaffiliated user is routed to a **Family Selection** step with two paths:
   - **Create a New Family** → user provides Family name, base currency, country (India, v1) → Family created, this user is auto-set `role = admin`, `status = active`.
   - **Join an Existing Family** → user is shown a list of `is_discoverable = true` families → selects one → if `join_policy = open`, becomes `active` immediately; if `join_policy = approval_required`, becomes `pending_approval` and the target family's Admin(s) see a pending-request notification/badge to approve or reject.
3. A `pending_approval` member can log in but sees only a waiting-state screen (no financial data access) until an Admin approves them.
4. This self-serve path coexists with the original Admin-invite path (FR-3 below) — either an Admin invites someone directly (skips the join-request step entirely), or a user finds/joins a family themselves and waits for approval. Both converge on the same `active` end-state.

- FR-1: A user account (`Member`) can be tied to **at most one Family** at any time; `family_id` is null until set via Create or Join.
- FR-2: The creator of a Family is automatically promoted to `role = admin` for that family.
- FR-3: An existing Admin can also directly invite/create new Members into their family (username + temp password, forced change on first login) — this bypasses the join-request/approval step since the Admin is initiating it.
- FR-3a: An Admin can toggle their Family's `join_policy` (open vs approval_required) and `is_discoverable` flag in Family Settings.
- FR-3b: An Admin sees a **Pending Requests** list (members with `status = pending_approval` targeting their family) and can Approve (→ `active`) or Reject (→ back to `unaffiliated`, user can pick a different family or create their own).
- FR-4: Admin can deactivate (not hard-delete) a Member; deactivated members' historical data remains in family aggregates for audit continuity but they can no longer log in.
- FR-5: Admin can trigger a password reset for any Member (generates temp password or reset link/token, delivery mechanism configurable — email integration is future scope; v1 shows a one-time reset code Admin can relay manually).
- FR-6: Any Member can change their own password (requires current password).
- FR-7: Login is username/password; session via JWT access token (short-lived) + refresh token (longer-lived, stored HttpOnly cookie).
- FR-8: Username uniqueness is enforced **globally** across the deployment (not per-family), since registration happens before a family is chosen.

### 4.2 Assets & Income
- FR-10: Member can add/edit/soft-delete an Asset of any supported type with currency, current value, and optional interest rate/maturity date.
- FR-11: For FD/RD/interest-bearing assets, system computes **projected maturity value** (see §7.6) shown as a secondary figure alongside manually-entered current value; user's manual value always takes precedence for net-worth totals (projection is advisory).
- FR-12: Member can add Income entries as recurring-monthly or one-off; recurring entries can be **stopped** (sets end_date) or **edited** (supersession per §3.2.1).
- FR-12a: Recurring Income entries feature a `reminders_enabled` flag (default true) and `due_day_of_month`. When enabled, scheduled incomes appear in the Dashboard **Pending Reminders** section on their arrival date.
- FR-12b: **Monthly Inline Confirmation & Variance**: Members can confirm income arrival with 1-click or modify the actual amount received for that specific month (e.g. fluctuating salary, partial/variable rental income) directly from the Dashboard. This logs a `MonthlyIncomeReceipt` instance for that month without altering the base contracted recurring income.
- FR-13: All Asset/Income CRUD immediately re-triggers Family Portfolio recalculation (see §8).

### 4.3 Loans
- FR-20: Member adds a Loan with principal, rate, interest type (simple/compound + compounding frequency), tenure, start date, EMI type (fixed/flexible), and optional prepayment penalty terms.
- FR-21: System **calculates EMI and full amortization schedule automatically** from principal/rate/tenure using the country-specific formula (§7.5).
- FR-22: If the user instead inputs a known EMI amount, system validates it against the computed EMI:
  - If within tolerance (configurable, default ±1%), accept user's EMI as authoritative and use it for schedule generation.
  - If outside tolerance, system **auto-adjusts**: it recomputes the effective outstanding/rate implied by the user's EMI and flags the loan with a "reconciled" badge + audit note showing both the system-calculated and user-provided EMI, so the user can see the discrepancy and confirm which is correct. This resolves the "input EMI → auto-adjust" requirement without silently discarding user data.
- FR-23: Loan detail view shows full repayment schedule (installment-by-installment): due date, opening balance, EMI, principal/interest split, closing balance, paid status.
  - The schedule table features an **accumulated summary footer row** directly under the grid displaying the sum of **Principal** and the sum of **Interest** under their respective columns, alongside total outflows under EMI.
  - The top summary cards on the Loan Detail page prominently display **Total Lifetime Interest** alongside Outstanding Principal, Current Rate, and Monthly Obligation.
- FR-24: Any schedule row can be manually corrected (e.g., wrong value entered); correction is captured in AuditLogEntry and triggers schedule regeneration downstream of that row per the regeneration rule (§3.2, LoanScheduleEntry note).
- FR-25: **Prepayment Calculator ("what-if")**: given a hypothetical extra amount and a chosen mode (reduce tenure vs reduce EMI), system shows: new schedule preview, months saved OR new EMI, total interest saved, any penalty deducted — without committing the change until user confirms "Apply."
- FR-26: On "Apply," a PrepaymentRecord is created, and the loan's live schedule is regenerated from the current date forward.
- FR-27: **Gold / Jewel Loan Running-Balance & Bullet Repayment Engine**:
  - If `loan_type = jewel` or `gold`: Loan operates as a running-balance ledger with bullet repayment (not a fixed amortisation schedule).
  - Daily interest accrues as $\text{balance} \times \frac{\text{rate}}{365}$ and capitalises on the last calendar day of each month.
  - Users can record manual payments on any date; payments split the calendar month into segments.
  - The full outstanding balance is due at maturity (default 12 months from disbursal) or upon one-go payoff.
  - Isolated calculation module ensuring all other loan types (Home, Car, Personal, etc.) remain strictly on their standard amortisation logic.

### 4.4 Debt Repayment Suggestion Engine
- FR-30: Given a family's available surplus and selected **prepayment mode** (`one_off_lump_sum` or `recurring_monthly`), the engine computes and displays **multiple strategies side-by-side**:
  1. **Avalanche** (highest interest rate first)
  2. **Snowball** (smallest outstanding balance first)
  3. **Custom-Weighted** — interactive percentage sliders per active loan (0% to 100%). Default allocation sets 100% on the loan with the highest principal balance (0% on others). Adjusting any slider auto-balances the highest loan to maintain a strict 100% total. Computes per-loan interest savings alongside overall household savings. The configuration can be saved persistently in family settings until debts close.
  4. **AI Suggestion** — a natural-language-explained recommendation (see §7.7) tailored to the prepayment mode that may split surplus across 2+ loans (e.g., 50/50) with reasoning, generated via an LLM call given the anonymized loan portfolio snapshot.
  *(Note: The minimum-payment baseline card is excluded from acceleration strategy comparison cards since minimum EMIs provide no acceleration; baseline metrics serve solely as internal mathematical reference).*
- FR-30a: **One-Off vs Recurring Mode Semantics**:
  - In `one_off_lump_sum` mode: the surplus is allocated in Month 1 across the target loan(s). For Month 2 onwards, all remaining loans continue on their baseline minimum EMIs. The engine calculates the total lifetime interest saved and total months shaved off by deploying that lump sum today.
  - In `recurring_monthly` mode: the surplus is injected continuously every month, cascading to subsequent loans as each loan closes.
- FR-31: Each strategy shows: allocation table (loan → extra amount), projected interest saved, projected debt-free date for that loan/overall, direct links to execute prepayment on the target loan, and a plain-language rationale.
- FR-32: User can select a strategy as "chosen" (stored in SuggestionSnapshot) purely for their own tracking/comparison over time; this does not auto-apply any prepayment — user must separately use the Prepayment Calculator (§4.3 FR-25) to actually commit.
- FR-33: Suggestions **recompute on demand and whenever underlying data changes** (new loan, edited rate, income/expense change) — always live, never stale beyond the last data edit.

### 4.5 Expenses
- FR-40: Member can create custom ExpenseCategory entries at any time (family-shared taxonomy) and log ExpenseEntry transactions against them.
- FR-41: Expense entries are editable/deletable.
- FR-42: Insurance premiums due are automatically reflected as an ExpenseEntry in the linked category on/near their due date (system-generated entries are tagged `source=insurance_auto` and are still editable, but editing does not alter the InsurancePolicy record itself — it only affects that month's logged expense).

### 4.6 Dashboard / KPIs
- FR-50: Family-level dashboard aggregates all Members' data (currency-converted to Family base currency) showing at minimum: Net Worth, Total Assets, Total Liabilities, Monthly Income, Monthly Expenses (day-to-day + insurance premiums pro-rated), Monthly EMI Outflow, Monthly Net Savings, Savings Rate %, Debt-to-Income Ratio, Projected Debt-Free Date (combined, based on current surplus + chosen strategy).
- FR-51: Charts: Net Worth trend (line, monthly), Asset Allocation (donut), Liability Breakdown by loan type (donut/bar), Income vs Expense vs EMI (stacked bar, monthly, trailing 12 months), Debt Payoff Timeline (Gantt-style: each loan's remaining balance declining to zero across future months, overlaying the chosen strategy), Expense Category Breakdown (donut, current month + trend).
- FR-52: Combined payoff simulator: "If I close loans one at a time (snowball-style, whole surplus to one loan)" vs "If I split across all loans" vs "Custom" — each shown as an alternate timeline on the same Debt Payoff chart for direct comparison, satisfying "one-go vs take-one-loan-first" comparison.

### 4.7 Audit
- FR-60: Every create/update/(soft)delete on Asset, Income, Loan, LoanScheduleEntry, Expense, Insurance, Member, plus login and password-reset events, is recorded in AuditLogEntry with before/after field diffs.
- FR-61: Family Admin can view a filterable Audit Trail screen (by member, entity type, date range).
- FR-62: Soft-deleted records can be restored by Admin from the Audit Trail (restore action re-activates the record and logs the restore).

---

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Accuracy | Loan/EMI math must match standard financial formulas to the cent/paisa; unit-tested against known amortization tables for both simple and compound interest. |
| Performance | Dashboard aggregation for a family with up to ~50 loans/500 transactions renders in < 1s (pre-aggregated/cached SuggestionSnapshot pattern where feasible). |
| Security | Passwords bcrypt-hashed (cost factor ≥ 12); JWT signed with rotating secret; all financial API routes require authenticated + family-scoped authorization (a Member can never read/write another family's data). |
| Data Integrity | All monetary calculations use fixed-point/decimal arithmetic (never floating point) to avoid rounding drift. |
| Portability | Business logic (interest engine, suggestion engine) has zero dependency on storage mode — same code path for LocalStorage and server DB via Repository interface. |
| Auditability | No hard deletes on financial records in server mode — soft delete + audit trail only. |
| Localization | Currency formatting and country-specific loan rules driven by config, not hardcoded. |
| Accessibility | WCAG 2.1 AA target for dashboard and forms (contrast, keyboard nav, screen-reader labels on charts' data tables). |

---

## 6. Security & Access Model

### 6.1 Roles & Visibility
- **Admin**: full CRUD on all family data + user management.
- **Member**: full CRUD on their **own** Assets/Income/Loans/Expenses/Insurance; **read-only** on the consolidated family dashboard and other members' entity lists (so the family sees a shared picture, but can't edit each other's raw entries) — this default is configurable per family in Settings (`allow_cross_member_edit: boolean`) for families who want full shared editing.
- All roles see the same Family-level KPIs/charts (the point of the "one family portfolio" requirement).

### 6.2 Authentication Flow
1. Login: username + password → backend verifies bcrypt hash → issues access JWT (15 min) + refresh JWT (7 days, HttpOnly cookie).
2. Password Reset (Admin-initiated): Admin generates a one-time reset token for a Member → Member (or Admin on their behalf) uses it to set a new password → token invalidated after use or 24h expiry.
3. Self password change: requires current password re-entry.

---

## 7. Financial Calculation Engine (Core Logic)

### 7.1 EMI Formula — Compound Interest (Reducing Balance)
Standard formula used by most home/car/personal loans:
```
EMI = P × r × (1 + r)^n / ((1 + r)^n − 1)
```
Where `P` = principal, `r` = monthly interest rate (annual_rate / 12 / 100), `n` = tenure in months.

### 7.2 Simple Interest Loans (flat-rate, common for jewel/some personal loans)
```
Total Interest = P × R × T   (R = annual rate as decimal, T = tenure in years)
EMI = (P + Total Interest) / n
```
Note: under simple/flat interest, the principal/interest split per installment is typically **even** (interest portion = Total Interest / n each month) rather than reducing-balance — this is configurable per loan (`flat_split: even | declining`) since some lenders compute flat-rate jewel loans with declining splits too.

### 7.3 EMI Reconciliation Logic (FR-22 detail)
```
computed_emi = f(P, r, n, interest_type)
if |user_input_emi − computed_emi| / computed_emi <= tolerance:
    authoritative_emi = user_input_emi
else:
    # Solve implied rate or implied outstanding that reconciles user's EMI,
    # holding tenure fixed, using iterative solver (Newton-Raphson) on the
    # EMI formula inverted for r.
    implied_rate = solve_for_rate(P, n, user_input_emi)
    flag_discrepancy(computed_emi, user_input_emi, implied_rate, stated_rate)
    authoritative_emi = user_input_emi   # user's real-world EMI always wins
    schedule = generate_with(P, implied_rate_or_stated_rate_per_setting, n, user_input_emi)
```
The user can choose in Loan Settings whether reconciliation trusts the **stated rate** (and just accepts a schedule that may not fully amortize to zero — flagged) or the **implied rate** (schedule guaranteed to amortize exactly to zero on the user's real EMI). Default: implied rate, since matching real-world bank statements is the priority ("It need to be accurate").

### 7.4 Prepayment Calculator Logic (FR-25)
Given extra amount `X` applied on date `D`:
- **Reduce Tenure mode**: EMI stays the same; recompute new `n'` such that the outstanding balance (after applying `X` to principal) amortizes to zero at the same EMI. `n' = -ln(1 − (r × (P−X)) / EMI) / ln(1 + r)`. Months saved = `n − n'`.
- **Reduce EMI mode**: Tenure stays the same (`n` unchanged from current remaining tenure); recompute new EMI on reduced principal `(P − X)` over remaining `n`. New EMI = standard EMI formula with `P' = P − X`.
- Penalty: if `prepayment_penalty_type != none`, compute per configured type and subtract from net benefit shown to the user (e.g., "You save ₹48,000 in interest, minus ₹2,500 prepayment penalty = ₹45,500 net benefit").
- Output always shows: interest saved, new payoff date, penalty cost, net benefit, and a preview schedule diff.

### 7.5 Country-Aware Rule Set
A `CountryLoanRuleSet` table drives which formula variant, day-count convention, and default interest-type assumptions apply per country + loan type (e.g., India personal loans commonly use reducing-balance monthly compounding, while jewel loans are frequently flat/simple-interest; mortgage day-count conventions vary by country — Actual/365 vs 30/360 etc.). When a Family's `country` is set, new loans default to that country's rule set (but remain user-overridable per loan, and the rule set is **snapshotted onto the loan at creation** so later changes to the country's rule set don't silently alter existing loans' math). This satisfies "depends on the country the logic varies automatically" while keeping historical loans stable and auditable.

**Launch scope (v1): India (`IN`) only**, seeded with rule rows for home/car/personal/jewel/education/other loan types. The `country` field on Family and `country_rule_set` snapshot on Loan are still modeled as extensible lookups (not hardcoded to India in the schema), so adding a second country later is a data-seeding exercise, not a schema/engine change. Additional countries are explicitly **future scope** (§14).

### 7.6 Asset Projection (FD/RD)
```
Maturity Value (compound, standard FD) = P × (1 + r/f)^(f×t)
```
`f` = compounding frequency/year, `t` = years to maturity. Shown as "Projected Maturity Value" next to the manually-tracked "Current Value" — advisory only, never overrides the user's manual entry in net-worth totals (per FR-11).

### 7.7 Floating-Rate Loans & Rate Revision Engine (RLLR / EBLR)
Indian retail lending (specifically RBI-mandated External Benchmark Linked Lending Rates / Repo Linked Lending Rates on Home Loans) features periodic interest rate revisions. When the repo rate changes (e.g., cuts from 8.65% down to 7.40% or subsequent hikes), borrowers experience one of two structural adjustments:

1. **Keep EMI Fixed (Default / Standard Indian Practice):**
   - The monthly EMI remains untouched (`EMI' = EMI`).
   - The remaining tenure contracts (on rate cuts) or expands (on rate hikes) using logarithmic amortization on current outstanding principal $P$:
     $$n' = \left\lceil -\frac{\ln\left(1 - \frac{r' \times P}{\text{EMI}}\right)}{\ln(1 + r')} \right\rceil$$
     Where $r' = \frac{\text{new annual rate}}{12 \times 100}$.
   - The schedule regenerates from the revision date forward, with the final installment adjusted to clear the remaining fractional balance.
   - Total interest saved vs previous schedule is computed and recorded in `RateRevisionRecord`.

2. **Keep Tenure Fixed:**
   - The remaining tenure $n$ is held constant.
   - The monthly installment is recalculated with new rate $r'$:
     $$\text{EMI}' = \frac{P \times r' \times (1 + r')^n}{(1 + r')^n - 1}$$

### 7.8 Broken-Period / Accrued Simple Interest on Prepayments
When a borrower makes a part-payment mid-cycle (between scheduled EMI dates), Indian lenders (such as HDFC, SBI, ICICI) calculate and charge **accrued simple interest** for the broken period (days elapsed from the last EMI due date to the part-payment execution date) on the unpaid balance:
$$\text{Accrued Interest} = \frac{P \times R \times \text{Days}}{365 \times 100}$$
- **Total Cash Outflow:**
  $$\text{Total Outflow} = \text{Principal Prepayment Amount} + \text{Penalty Charged} + \text{Accrued Simple Interest}$$
- The full principal amount is credited directly against outstanding balance, while the accrued interest is recorded in `PrepaymentRecord.accrued_interest` and included in total cash outflow without artificially distorting the amortization schedule balance.

### 7.9 Bank Statement Calibration Engine
Real-world bank statements often deviate slightly from textbook formulas due to leap-year day counts, rounding truncations, staggered rate reset effective dates, or fee debits. To guarantee 100% real-world accuracy without requiring manual reconstruction of years of historical entries:
1. The user inputs their live statement snapshot:
   - Current Outstanding Principal ($P_{\text{statement}}$)
   - Remaining Tenure Months ($n_{\text{statement}}$)
   - Current Annual Rate ($R_{\text{current}}$)
   - Real-world Monthly EMI ($\text{EMI}_{\text{actual}}$)
2. The calibration engine replaces future unpaid installments with an exact amortization schedule derived from $(P_{\text{statement}}, R_{\text{current}}, n_{\text{statement}}, \text{EMI}_{\text{actual}})$.
3. The final $n^{\text{th}}$ installment is automatically adjusted to absorb any fractional residual tail, guaranteeing the loan balance reaches exactly ₹0.00.
4. An audit log entry is recorded documenting the statement reconciliation point.

### 7.10 Debt Strategy Engine — Detail
All strategies run against a parameterized simulation core supporting two distinct Prepayment Modes:

1. **Prepayment Modes:**
   - **One-Off Lump Sum (`one_off_lump_sum`)**:
     - Simulates deploying a single lump-sum windfall (e.g. bonus, dividend, matured deposit) in **Month 1**.
     - In Month 1: The engine allocates the lump sum to target loan(s) according to the strategy rule.
     - In Month 2+: Zero extra surplus is added ($S_t = 0$). Remaining loans continue with their regular contractual minimum EMIs on their reduced principal balances.
     - Metrics Output: Accurately computes the total lifetime interest saved and total tenure months reduced across all loans strictly attributable to this one-time lump-sum prepayment.
   - **Recurring Monthly (`recurring_monthly`)**:
     - Simulates an ongoing extra monthly cashflow available every month ($S_t = \text{Surplus}$) until every loan reaches ₹0.00.
     - As individual loans are paid off, the freed-up EMI plus surplus cascades into subsequent loans.

2. **Strategy Allocation Policies:**
   - **Avalanche**: sort active loans by `interest_rate_annual` descending; allocate to top-rate loan first until paid off.
   - **Snowball**: sort by `current_outstanding_principal` ascending; allocate to smallest-balance loan first until paid off.
   - **Custom-Weighted**: allocates surplus across active debts based on user-defined percentage sliders (0% to 100%). By default, 100% is allocated to the highest principal loan. When any slider is moved, the highest loan auto-balances so the total across all loans is 100%. Surplus is partitioned as `surplus * (pct / 100)` per loan. Calculates each individual loan's lifetime interest saved and tenure shaved, alongside overall portfolio savings. Users can persist this configuration in Family Settings (`strategy_weights.loanPercentages`) until debts are cleared.
   - **AI Suggestion (On-Demand)**: Requested only when the user explicitly enables AI (`include_ai = true`). When enabled, the anonymized loan portfolio snapshot along with the `prepayment_mode` is passed server-side to the **Google Gemini API** (`gemini-2.x`). The prompt instructs the model on whether this is a one-off windfall allocation or a monthly recurring surplus. Gemini returns `{allocations: [{loan_id, extra_amount}], rationale: string}`, which is fed into the simulation core. Graceful degradation omits the card if Gemini is unavailable or disabled.

3. **Multi-Loan Cascading Overflow Guarantee (Crucial Rule):**
   - Whenever surplus funds (in either `one_off_lump_sum` or `recurring_monthly` mode) exceed the outstanding balance of the target loan, the engine **must never discard the excess funds**.
   - The primary target loan receives the exact principal needed to reach ₹0.00 (clearing the loan).
   - Any remaining surplus **cascades immediately** to the next ranked loan in the strategy's priority list:
     - **Snowball**: Cascades to the 2nd smallest balance loan, then 3rd, and so on until 100% of the surplus is deployed or all debt is eliminated.
     - **Avalanche**: Cascades to the 2nd highest APR loan, then 3rd, and so on.
     - **Custom-Weighted**: If a loan's allocated portion clears its balance, the overflow cascades to the next active debt with a balance.
   - Each strategy card's allocation list reflects the exact multi-loan partition of the surplus, and lifetime interest savings reflect the deployment of the entire surplus amount.

4. **Executive Strategy Recommendation Banner:**
   - An executive summary banner rendered directly above the strategy comparison cards provides immediate strategic clarity:
     - **Maximum Savings Leader**: Name of strategy and exact lifetime interest saved (dynamically derived from whichever simulated strategy produces maximum interest savings: Custom-Weighted, Avalanche, Snowball, or AI Smart Plan).
     - **Quickest Milestone Closure**: Identifies loans that can be completely extinguished today with this lump sum (e.g. "Instant Milestone: Fully eliminate Insurance Premium (₹69,881) today to remove 1 monthly EMI obligation").
     - **Actionable Verdict**: Practical recommendation synthesizing interest savings and psychological cash-flow relief, accurately citing the leading strategy title and interest saved amount.

All strategies output consistent card formats with target loan highlights, direct links to `/loans/:id` for execution, and interest saved. The screen features a dedicated Loan Portfolio Breakdown chart categorizing debts across Personal, Home, Gold/Jewel, and other retail liabilities.

### 7.11 Household Expenses & Loan EMI Separation
To keep household cash flows clean and avoid double-counting debt obligations with daily living costs:
1. **Separation Rule**:
   - The Household Expenses view and monthly expense totals strictly track extra household expenditures (groceries, electricity, utility bills, fuel, subscriptions, etc.).
   - Contractual loan EMIs are tracked independently in the Loans & Liabilities section and appear as the dedicated "EMI" metric in Dashboard Monthly Outflow.
   - Loan EMIs are not auto-logged into the household expenses table, ensuring that "Total spending" in Expenses and "Exp:" on the dashboard reflect true household living costs without inflating outflow.
   - **Action in Loan Detail Schedule:** When a user marks an installment as paid directly within the Loan Repayment Schedule table, the linked expense queue entry is simultaneously marked as paid (`is_paid = true`).
   - If an installment is edited or corrected, the linked expense record amount updates to reflect the authoritative figure.

### 7.12 Dashboard Pending Reminders & Monthly Action Queue
To give families complete real-time control over variable cash flows (e.g. fluctuating monthly salary, varying rental payments from multiple properties, and scheduled EMI debits):
1. **Recurring Income Reminders**:
   - For all active recurring incomes with `reminders_enabled = true`, the system generates a pending arrival reminder card for the current calendar month.
   - Displays: Source Label, Expected Arrival Day, Contracted Expected Amount.
   - Action 1: **"Confirm Received"** (1-click arrival when full amount is received as expected).
   - Action 2: **Inline Amount Modification** (enter actual amount received, e.g. tenant paid ₹10,000 instead of ₹12,000, or salary included overtime ₹1,65,000).
   - Upon confirmation, a `MonthlyIncomeReceipt` is stored for that month (`year_month`, `received_amount`, `status: received`).
   - Dashboard KPI aggregation incorporates confirmed `MonthlyIncomeReceipt` actuals for the current month while continuing baseline projections for upcoming months.
2. **Loan EMI Reminders**:
   - Displays all active monthly EMIs with `emi_reminders_enabled = true` due in the active month.
   - Action: **"Mark EMI Paid"** executes bi-directional synchronization with both the Loan Repayment Schedule and the Expense ledger.

   - If an installment is edited or corrected, the linked expense record amount updates to reflect the authoritative figure.

### 7.13 Gold / Jewel Loan Running-Balance & Bullet Repayment Engine (Story 4)
Gold/Jewel loans (`loan_type == 'jewel'` or `'gold'`) operate as running-balance ledger accounts with bullet repayment at maturity, rather than fixed amortization schedules.

1. **Daily Accrual & Monthly Capitalization Formula**:
   - Interest accrues daily on the current outstanding balance:
     $$\text{Daily Interest} = \text{Balance} \times \frac{\text{Annual Rate}}{100} \times \frac{1}{365}$$
   - Accrued interest is posted on the **last calendar day of each month** (`INTEREST_POSTED`) and added to the balance (monthly compounding):
     $$\text{Balance}_{\text{new}} = \text{Balance}_{\text{old}} + \sum_{\text{days in month}} \text{Daily Interest}$$
   - In the first partial month, the disbursal date is counted as Day 1 (e.g. 16 Dec to 31 Dec = 16 days). First partial period interest uses bank floor truncation matching commercial bank conventions.
   - Days count uses exact calendar days per month (e.g. Feb = 28 or 29 days).

2. **Transaction Segmentation on Manual Payments**:
   - Users can make manual payments of any amount on any date.
   - When a payment occurs on date $D$, the month is segmented:
     - Segment 1: from month start to payment date (exclusive) on the pre-payment balance.
     - Segment 2: from payment date to month end on the reduced balance.
   - Payments take effect immediately on their payment date.

3. **Bullet Payoff & Debt Strategy Integration**:
   - The entire principal + remaining accrued interest is due at maturity (default 12 months from disbursal) or closure.
   - **Debt Strategy Engine Integration**:
     - The baseline monthly obligation for a Gold Loan is defined as the monthly accrued interest (servicing the interest prevents the balance from compounding).
     - Extra surplus allocation directly reduces the principal balance, lowering all subsequent daily interest charges and future capitalized amounts.
     - Final month requires full bullet payoff of remaining balance.

---

## 8. Portfolio Aggregation Logic

Recomputed reactively (or on a short debounce) whenever any underlying entity changes:

```
Net Worth        = Σ Asset.current_value (currency-converted) − Σ Loan.current_outstanding_principal
Monthly Income    = Σ active recurring IncomeEntry.amount (this month) + prorated one-off entries in month
Monthly Expenses  = Σ ExpenseEntry.amount (current month) [includes insurance_auto entries]
Monthly EMI       = Σ active Loan LoanScheduleEntry.emi_amount for installments due this month
Monthly Savings   = Monthly Income − Monthly Expenses − Monthly EMI
Savings Rate %    = Monthly Savings / Monthly Income × 100
Debt-to-Income    = Monthly EMI / Monthly Income × 100
Available Surplus (engine input) = Monthly Savings (user-overridable per suggestion run)
```
All currency conversion uses the Family's `base_currency` and the latest `CurrencyRate` effective on/before the calculation date.

---

## 9. Multi-Currency Handling
- Every monetary entity stores its **original entry currency** and amount (source of truth).
- Family has one `base_currency` for all aggregated KPIs/charts.
- `CurrencyRate` table holds family-maintained conversion rates (manually updated in v1; external FX API sync is future scope).
- All conversions happen at read/aggregation time (not stored pre-converted), so updating a rate retroactively corrects all historical charts consistently — with a note that this is a simplification (true multi-currency accounting would snapshot the rate at transaction time; **v1 default is "current rate for all history"**, with an optional per-entity `locked_rate` field for users who want point-in-time accuracy on big-ticket items like a home loan taken in a foreign currency).

---

## 10. API Design (Server Mode)

Representative REST resources (all under `/api/v1`, JWT-protected, family-scoped):
```
POST   /auth/register                  (username/password only — creates status=unaffiliated Member)
POST   /auth/login
POST   /auth/refresh
POST   /auth/change-password

GET    /families/discoverable          (list is_discoverable=true families, for Join flow)
POST   /families                       (create — caller becomes admin, status=active)
POST   /families/:id/join              (join request — sets status per family.join_policy)

POST   /admin/members                  (Admin-direct invite/create member)
PATCH  /admin/members/:id              (deactivate/reactivate/role change)
POST   /admin/members/:id/reset-password
GET    /admin/members/pending          (list pending_approval members for this family)
POST   /admin/members/:id/approve
POST   /admin/members/:id/reject

GET    /assets            POST /assets            PATCH /assets/:id      DELETE /assets/:id
GET    /income            POST /income            PATCH /income/:id      DELETE /income/:id
POST   /income/:id/stop

GET    /loans             POST /loans             PATCH /loans/:id       DELETE /loans/:id
GET    /loans/:id/schedule
PATCH  /loans/:id/schedule/:entryId    (manual correction)
POST   /loans/:id/prepayment/preview   (calculator — no commit)
POST   /loans/:id/prepayment/apply

GET    /expense-categories   POST /expense-categories
GET    /expenses             POST /expenses         PATCH /expenses/:id   DELETE /expenses/:id

GET    /insurance         POST /insurance         PATCH /insurance/:id   DELETE /insurance/:id

GET    /dashboard/summary
GET    /dashboard/charts/net-worth-trend
GET    /dashboard/charts/payoff-timeline

POST   /suggestions/run                (body: {surplus_override?})
GET    /suggestions/history

GET    /audit                          (filter by member/entity/date)
POST   /audit/:id/restore
```

---

## 11. Data Lifecycle & Recalculation Triggers
| Event | Downstream Recalculation |
|---|---|
| Asset CRUD | Net Worth, Asset Allocation chart |
| Income CRUD/stop | Monthly Income, Savings Rate, Surplus (→ invalidates cached SuggestionSnapshot) |
| Loan create/edit (rate/principal/tenure/EMI) | Full schedule regeneration from today forward, Net Worth (outstanding), Monthly EMI, Debt-to-Income, Suggestion engine invalidated |
| Prepayment applied | Schedule regeneration, PrepaymentRecord logged, Suggestion engine invalidated |
| Expense CRUD | Monthly Expenses, Savings, Surplus |
| Insurance CRUD/premium due | Auto-generates/updates linked ExpenseEntry |
| Any of the above | AuditLogEntry created |

---

## 12. Testing Strategy
- **Unit tests**: EMI/simple-interest/compound-interest formulas against published amortization tables (multiple known real-world examples per country rule set); reconciliation solver edge cases; prepayment tenure-reduction/EMI-reduction math; currency conversion rounding.
- **Integration tests**: full CRUD → recalculation chain (e.g., adding a loan updates dashboard KPIs correctly); RBAC boundary tests (Member cannot access another family's data).
- **Scenario tests**: the 4-strategy suggestion engine against a fixed multi-loan portfolio fixture, asserting Avalanche/Snowball produce mathematically expected orderings, and Custom-Weighted respects configured weights.
- **Storage-mode parity tests**: identical business-logic test suite run against both the LocalStorage adapter and a test Postgres instance to guarantee behavioral parity.

---

## 13. Deployment Architecture (Production)
```
[Browser SPA] → [CDN/Static Hosting for frontend build]
                        │ HTTPS
                        ▼
              [Backend API — containerized]
                        │
                        ▼
              [Managed Postgres/MySQL] (per .env)
                        │
              [Optional: Scheduled Job Runner for daily accrual]
```
- Recommended: containerize backend (Docker), deploy to any platform (Render/Railway/Fly.io/AWS/Azure/self-host) — the `.env`-driven DB config makes this portable by design.
- Frontend can be deployed as a static build to any static host (Vercel/Netlify/S3+CloudFront) when in `server` mode, or run fully standalone (no backend at all) when a user just wants `local` mode for personal offline use.

---

## 14. Future Scope (Explicitly Deferred)
1. Bank/credit-card statement import (CSV/PDF parsing) for Assets and Expenses.
2. Budget limits + alerts per Expense Category.
3. Editable/flexible recurring Expense entries (v1 is manual entry only per requirement).
4. Automated FX rate sync via external API.
5. Notifications/reminders (EMI due, premium due, budget exceeded) via email/SMS/push.
6. Goal-based savings tracking (e.g., "₹5L by Dec 2027").
7. "What-if bonus/windfall" simulator across the whole portfolio (not just per-loan).
8. Mobile app (React Native) sharing the same backend API.
9. Multi-family/household comparison or shared-across-generations views.
10. Investment performance analytics (XIRR/CAGR per mutual fund/stock holding).
11. Countries beyond India for the Country Rule Set.
12. Invite-code/link-based family joining for non-discoverable families (v1 supports discoverable-list join + admin-approval only).

---

## 15. Decisions Confirmed for Build Kickoff
1. **Country scope**: India (`IN`) only at launch; schema remains multi-country-ready (§7.5).
2. **AI Suggestion provider**: Google Gemini API, server-side proxied, key via `GEMINI_API_KEY` in `.env` (§7.7).
3. **Family membership model**: one Member belongs to at most one Family; unaffiliated users either create a new family (become its Admin) or join an existing discoverable family (subject to that family's `join_policy`); usernames are globally unique across the deployment (§4.1, §3.2).

## 16. UX Workflow → Design Spec Mapping
This SDD intentionally keeps screen-level UX out of scope beyond the high-level flows referenced inline (e.g., §4.1's Create/Join Family workflow, §4.3's Prepayment Calculator flow). Full wireframe-level detail — screen layouts, components, states, and visual design — is covered in a **set of companion Design Spec documents**, split by page/module so each stays focused and easy to update independently:

| Workflow / Module | Detailed in |
|---|---|
| Design system, IA, shared components | `Design-Spec-00-Foundations.md` |
| Registration, Login, Create/Join Family, Pending-Approval state, Admin Approve/Reject | `Design-Spec-01-Auth-Family-Onboarding.md` |
| Family & "My" Dashboard, KPIs, all charts | `Design-Spec-02-Dashboard.md` |
| Assets, Income (recurring/one-off, supersession edit flow) | `Design-Spec-03-Assets-Income.md` |
| Loan List/Detail, Repayment Schedule, Prepayment Calculator | `Design-Spec-04-Loans-Repayment.md` |
| Debt Repayment Strategy Comparison (Avalanche/Snowball/Custom/AI) | `Design-Spec-05-Debt-Strategy-Comparison.md` |
| Expenses, Categories, Insurance | `Design-Spec-06-Expenses-Insurance.md` |
| Admin: Members & Access, Password Reset, Pending Requests; Audit Trail; Family Settings | `Design-Spec-07-Admin-Audit-Settings.md` |

Each Design Spec follows the same template: Screen purpose → Layout → Fields/Components → States (empty/loading/error) → Interaction notes, and defers to `Design-Spec-00-Foundations.md` for shared visual tokens and components rather than repeating them.
