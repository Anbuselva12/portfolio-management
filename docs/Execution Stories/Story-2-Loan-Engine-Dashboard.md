# Story 2 — Loan Engine & Full Dashboard

**Companion documents:** SDD-Family-Wealth-Manager.md (§4.3, §7.1–7.9, §11), Design-Spec-02-Dashboard.md, Design-Spec-04-Loans-Repayment.md

**Depends on:** Story 1 (requires Family/Member/Asset/Income/Expense foundation and Dashboard KPI strip to already exist)

**Goal:** Loans become fully modeled with an accurate, country-aware EMI/interest engine, floating-rate revisions, part-payments with broken-period interest, statement calibration, editable repayment schedules, a prepayment "what-if" calculator, and the complete charting dashboard.

---

## Scope

### Loan CRUD
- Fields: loan type, lender, currency, principal, interest type (simple/compound + compounding frequency), interest rate, tenure, start date, EMI amount (optional user input), EMI type (fixed/flexible), prepayment penalty type/value
- `country_rule_set` snapshotted onto the loan at creation from the Family's country (India only, seeded rule rows for home/car/personal/jewel/education/other)

### EMI / Amortization Engine
- Reducing-balance compound-interest EMI formula
- Simple/flat-interest formula (even-split and declining-split variants, configurable per loan)
- Full amortization schedule generation (installment-by-installment: opening balance, EMI, principal/interest split, closing balance)
- Schedule regeneration rule: preserves paid installments before "today," recalculates from next unpaid installment forward whenever principal/rate/tenure/EMI changes

### EMI Reconciliation Logic
- Compare system-calculated EMI vs user-input EMI against configurable tolerance
- Within tolerance: accept user's EMI as authoritative
- Outside tolerance: auto-adjust via implied-rate solver (Newton-Raphson), flag discrepancy, show both figures, log to be audited (full Audit UI itself is Story 3, but the flag/log data must be captured now)

### Repayment Schedule UI
- Full schedule table on Loan Detail screen: virtualized scroll, jump-to-month control
- Inline manual row correction (marks row as "edited manually")

### Floating-Rate & Rate Revision Engine (RLLR / EBLR)
- Log benchmark rate changes (e.g. RBI rate cuts/hikes).
- Mode 1: **Keep EMI Fixed** (contracts tenure on cuts via logarithmic amortization $n' = -\ln(1 - (r' \cdot P)/\text{EMI}) / \ln(1 + r')$).
- Mode 2: **Keep Tenure Fixed** (recalculates lower monthly EMI).
- Live preview showing months saved and lifetime interest saved.
- Preserves historical records in `RateRevisionRecord` ledger.

### Part-Payment with Broken-Period Accrued Simple Interest
- Direct modal accessible from Loan Details.
- Calculates and supports lender-charged **broken-period simple interest** ($P \times R \times \text{Days} / 36500$).
- Displays Total Cash Outflow ($\text{Principal} + \text{Penalty} + \text{Accrued Simple Interest}$) and net financial benefit.
- Creates `PrepaymentRecord` (storing `accrued_interest` and `total_paid`) and regenerates downstream schedule.

### Bank Statement Calibration
- Reconciles live loan with real-world bank statements in one step (current balance, remaining tenure, active rate, actual monthly EMI).
- Replaces future installments with exact schedule derived from statement values.
- Automatically handles residual balance tails on the final month ensuring exact ₹0.00 payoff.

### Loan Custom Metadata & Reminders Configuration
- Fields: **Loan Name** (e.g. "Home Loan Top Up"), **Place / Property / Purpose** (e.g. "Chennai Home"), **Comments / Notes** (personal borrower notes), and **EMI Reminders Toggle** (`emi_reminders_enabled: boolean`).
- Persisted on create and fully editable anytime via Loan Terms drawer.

### Monthly EMI Auto-Expense Queue & Bi-Directional Synchronization
- Automatically queues active monthly EMIs (excluding annual simple-interest jewel/gold loans) into the Monthly Expense list with an **"Auto (Loan EMI)"** badge on their scheduled due dates.
- Bi-directional Mark as Paid: marking an EMI paid in Expenses immediately marks the loan installment as paid and decrements loan balance. Marking an installment paid in the Loan Schedule marks the linked expense paid.

### Prepayment Calculator
- Inputs: extra amount, date, mode (reduce tenure / reduce EMI)
- Live preview: new payoff date or new EMI, interest saved, prepayment penalty deducted, net benefit, before/after schedule diff
- Explicit "Apply" step (never optimistic) — creates a PrepaymentRecord and regenerates the schedule from current date forward

### Dashboard v2 (extends Story 1's KPI strip)
- Net Worth Trend (line chart, trailing 12 months, Net Worth/Assets/Liabilities lines)
- Asset Allocation (donut by asset type)
- Liability Breakdown (donut/bar by loan type) + Debt-to-Income gauge
- Income vs Expense vs EMI (stacked bar, trailing 12 months, income line overlay)
- Debt Payoff Timeline (Gantt-style, single "Minimum Payments" baseline strategy only — multi-strategy overlay comes in Story 3)
- Total Liabilities KPI (previously 0 in Story 1) now correctly populated; Monthly EMI now feeds into Net Savings and Debt-to-Income

---

## Explicitly Out of Scope for This Story
- Debt Strategy Comparison screen, Avalanche/Snowball/Custom-Weighted/AI strategies (Story 3)
- Multi-strategy overlay on the Debt Payoff Timeline (Story 3)
- Audit Trail viewing/restore UI (Story 3)
- Countries beyond India (future scope, post-launch)

---

## Definition of Done
1. Adding a real loan (principal/rate/tenure/interest-type) produces an amortization schedule that matches a known published example for both simple and compound interest, verified via unit tests against reference tables.
2. Inputting an EMI that differs from the calculated EMI beyond tolerance triggers the discrepancy banner, and the schedule amortizes to zero using the reconciled figure.
3. A repayment schedule row can be manually corrected and the change is reflected in downstream rows per the regeneration rule.
4. Running the Prepayment Calculator in both modes (reduce tenure / reduce EMI) shows correct interest-saved and penalty math, and "Apply" correctly regenerates the live schedule and creates a PrepaymentRecord.
5. All five new Dashboard charts render correctly for a family with multiple loans across different types, and Total Liabilities/Monthly EMI/Debt-to-Income/Net Savings KPIs are now accurate (no longer showing 0/placeholder values from Story 1).
6. Storage-mode parity (LocalStorage vs real DB) holds for all new Loan/Schedule/Prepayment/RateRevision entities, consistent with Story 1's testing approach.
7. Logging a rate revision accurately recalculates remaining tenure or new EMI using Decimal math, creates a `RateRevisionRecord`, and regenerates the future schedule.
8. Recording a part-payment computes broken-period simple interest, reflects total cash outflow, adjusts remaining tenure/EMI, and records `accrued_interest` on `PrepaymentRecord`.
9. Statement calibration reconciles an existing active loan to bank statement figures and amortizes to exactly ₹0.00 with residual tail handling on the final installment.
10. Loan metadata (`name`, `place_or_purpose`, `comments`, `emi_reminders_enabled`) is persisted on creation, editable via Edit Terms, and displayed prominently in the UI.
11. Active loans with reminders enabled automatically post their monthly EMI into the month's expense queue, and marking as paid in either location synchronizes payment status and decrements balance.
12. Loans page list cards display accurate monthly EMI, interest rate, tenure, and header totals without empty fields.
13. Loans of all types support direct full closure with optional reason logging, intelligent smart auto-prompt when remaining dues reach zero, and full financial lockdown preventing extra payments or modifications while closed.
14. Gold Loan outstanding balance evaluates to the net payoff due at maturity under actual payments made (`finalClosingYours`), properly decreasing on part-payments; Gold Loan Detail view decommissions the maturity comparison section and features a collapsible month-by-month table (collapsed by default); standard amortized loans display an interactive "Outstanding balance over time" trajectory chart comparing baseline vs actual prepayments; Loans page features Active and Closed tabs filtering out soft-deleted items; and Household Expenses table renders standard expenses with full opacity and dark text, restricting strikethrough styling strictly to paid loan EMI auto-entries.
