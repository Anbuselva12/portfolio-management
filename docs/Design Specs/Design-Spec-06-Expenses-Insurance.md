# Design Spec 06 — Expenses & Insurance

**Companion to:** SDD-Family-Wealth-Manager.md §4.5, §3.2 (InsurancePolicy)
**Shared tokens/components:** see Design-Spec-00-Foundations.md

---

## 1. Screen: Expenses
- **List view**: filterable by Member, Category, Month; grouped by date (most recent first) or by category (toggle).
- **Category Manager** (via "+ Manage Categories"): simple list with Add New Category (name + icon/color picker), and disable (not delete) for categories currently in use.
- Add Expense: Category dropdown (with inline "+ New category" option), Amount, Currency, Date, Notes.
- **Auto-Generated Rows**:
  - System-generated insurance-premium rows carry a small **"Auto (Insurance)"** badge; editing such a row only affects that month's logged expense, not the underlying InsurancePolicy record.
  - **Auto-Generated Loan EMI Rows**: Active loans with `emi_reminders_enabled: true` (excluding annual simple-interest gold loans) automatically queue an EMI expense row on their scheduled due date, carrying a distinct **"Auto (Loan EMI)"** indigo badge.
  - **Bi-Directional "Mark as Paid"**: Each queued EMI expense row features an actionable "Mark as Paid" toggle/button. Clicking it marks the expense paid AND immediately marks the linked `RepaymentInstallment` on the loan as paid (updating loan outstanding balance and audit trail). Likewise, marking an installment paid on the Loan Detail page marks the corresponding expense row as paid.
  - **Row Styling Integrity**: Standard manual and recurring household expenses are rendered with 100% opacity, crisp foreground text, and non-strikethrough amounts. Strikethrough and dimmed `opacity-60` styling is strictly confined to loan EMI auto entries that have been marked as paid. Normal household expenses must never appear strikethrough or grayed out.

## 2. Screen: Insurance
- **List view**: cards per policy — Type, Provider, Policy Number, Sum Assured (labeled "Not included in Net Worth"), Premium + Frequency, Next Due Date, Status.
- Add/Edit form includes linking to an Expense Category so premiums flow into Expenses automatically.
- Explicit helper text under Sum Assured: "Insurance is tracked as a policy record, not as a portfolio asset. Its premiums count toward your monthly expenses."

## States
- Empty state (Expenses): "No expenses logged yet — start by adding today's spending, or set up your recurring bills as categories."
- Empty state (Insurance): "No policies tracked yet."
- Lapsed policy: red status badge, no further auto-expense generation until reactivated.
