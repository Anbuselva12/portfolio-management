# Story 1 — Foundation, Family Onboarding & Core Portfolio Data

**Companion documents:** SDD-Family-Wealth-Manager.md (§3, §4.1–4.2, §4.5, §6), Design-Spec-00-Foundations.md, Design-Spec-01-Auth-Family-Onboarding.md, Design-Spec-03-Assets-Income.md, Design-Spec-06-Expenses-Insurance.md, Design-Spec-07-Admin-Audit-Settings.md

**Goal:** A working multi-user app where a family can be created/joined, and members can log their assets, income, expenses, and insurance to see a basic net-worth number.

---

## Scope

### Auth
- Register (username/password only, `status = unaffiliated`)
- Login (JWT access + refresh token)
- Change password (self-service, requires current password)

### Family Onboarding
- Family Selection screen: Create New Family (base currency, country = India fixed, join_policy/is_discoverable toggles) or Join Existing Family (browse discoverable families list)
- Pending-Approval holding screen (no data access until approved)
- Admin: direct member invite (username + temp password), Pending Requests list (Approve/Reject), Deactivate/Reactivate member, Reset password for any member

### Storage-Mode Scaffolding
- Repository interface defined for all entities in this story (Family, Member, Asset, IncomeEntry, ExpenseCategory, ExpenseEntry, InsurancePolicy)
- LocalStorage adapter implementing the same interface (local/dev mode)
- One real DB driver wired via `.env` (server mode) — prove both modes pass the same test suite against identical business logic

### Assets Module
- Full CRUD (type, name, currency, current value, principal invested, interest rate, maturity date, notes)
- FD/RD projected-maturity calculation (advisory figure, does not override manual current_value)
- Soft delete + restore-ready (restore UI itself lands in Story 3, but soft-delete flag must exist now)

### Income Module
- Recurring entries: add, stop (sets end_date), edit-with-supersession (closes current entry, opens a new linked one — preserves month-by-month history)
- One-off entries: add, direct edit, delete

### Expenses Module
- User-defined ExpenseCategory (family-shared taxonomy), seeded with common defaults on family creation
- ExpenseEntry: full CRUD

### Insurance Module
- Policy CRUD (type, provider, policy number, sum assured — explicitly excluded from net worth, premium amount/frequency, next due date)
- Linked auto-expense generation: premium due auto-creates/updates an ExpenseEntry tagged `source=insurance_auto` in the linked category

### Dashboard v1
- KPI strip only: Net Worth, Total Assets, Total Liabilities (will read 0 — no Loan module yet), Monthly Income, Monthly Expenses, Net Savings
- No charts yet (charts land in Story 2)
- "Whole Family" vs "Just Me" toggle

### Settings Shell
- Family Settings: base currency (display only in v1, India-fixed), join policy controls
- My Profile: change password, display name, preferred currency

---

## Explicitly Out of Scope for This Story
- Loans, repayment schedules, prepayment calculator (Story 2)
- Any chart beyond the KPI strip (Story 2)
- Debt strategy engine, AI suggestions (Story 3)
- Audit Trail UI (soft-delete flags exist, but the Audit log screen/restore action is Story 3)
- Multi-currency conversion logic (single base currency = INR for this story; the CurrencyRate table and conversion UI land in Story 3)

---

## Definition of Done
1. Two independent test families can each register, and members can join via both the direct-invite path and the join-request/approval path.
2. Every member can add/edit/delete their own Assets, Income (recurring + one-off), Expenses, and Insurance policies.
3. A recurring income edit (e.g., simulated rent increase) correctly preserves history via the supersession mechanism — verified by inspecting two IncomeEntry rows with correct start/end dates.
4. An Insurance policy's premium due date correctly generates a tagged ExpenseEntry.
5. The Dashboard KPI strip shows accurate Net Worth, Total Assets, Monthly Income, Monthly Expenses, and Net Savings for a family with mixed data.
6. The same test suite (CRUD + supersession + auto-expense generation) passes identically against the LocalStorage adapter and the configured real database, proving storage-mode parity.
7. An Admin can deactivate a member, reset another member's password, and approve/reject a pending join request end-to-end.
