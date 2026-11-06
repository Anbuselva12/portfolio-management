# Design Spec 12 — Project Funding, Tagging & Returns

**Companion to:** SDD §4.11 (FR-90 … FR-98), Design-Spec-06 §1a, Design-Spec-08 §8, Design-Spec-09
**Status:** Approved by owner 2026-10-19 (decisions below)

## 1. Owner Decisions
| # | Decision |
|---|---|
| 1 | Tracker tables **keep their names**; only additive columns/tables (minimal production impact). |
| 2 | A loan can fund **several projects** via per-project allocated amounts. |
| 3 | **Option A** — own funds are derived (invested − loans). Cash is recorded by adding expense entries to the project. |
| 4 | Tagging is at the **source** (income stream, loan), never per transaction row. |
| 5 | Optional **current market value** on a project, used to show appreciation and total return. |

## 2. Navigation
- Expense Tracker is removed from the App Switcher. The App Switcher itself has since been removed (FairShare retired 2026-11-06).
- Sidebar **Expenses** → page with a segmented control **Household | Projects** (`/expenses`, `/expenses/projects`).
- Project workspace: `/expenses/projects/:id`. `/tracker`, `/tracker/projects/:id` redirect. `/tracker/settings` redirects to `/settings/profile`.
- Users with `preferred_app = expense_tracker` land on `/expenses/projects`.

## 3. Project Workspace Tabs
**Funding & Returns** (new, first tab) · Expenses Log · Reports & Analytics · Configuration (unchanged).

### 3.1 Funding & Returns layout
1. **KPI strip** (2 columns on phones): Total invested · Funded by loans (with interest paid) · Total income received · Rent/income per month · Gross yield · Net monthly after EMI. With a current value set: Current value · Appreciation · Total return % are appended.
2. **Current market value** inline editor (pencil → input → save; clearing removes it).
3. **Charts** (Recharts, `ResponsiveContainer width="100%"`):
   - *How it was funded* — one stacked horizontal bar of the tagged loans (own colour each), labelled with ₹ and %. Own funds are no longer shown (2026-10-19).
   - *Income received per month* — bars, one per month from the first receipt to the current month.
   - *Payback progress* — cumulative income received (line) against a reference line at Total invested.
   - *Income vs. loan EMIs, monthly* — two bars with the coverage % in the caption.
4. **Linked loans** table: loan, share of loan used, amount allocated, outstanding (share), EMI (share), interest paid (share). Footer totals. Row action: *Edit allocation*.
5. **Linked income** table: stream, type, status, per month, received so far, total. Row action: *Change project*.
6. Empty states: no loans → "No loans tagged yet — tag a loan from Loans or Transactions"; no income → equivalent.
7. Over-funded note when loans exceed invested ("Loans exceed recorded spend by ₹X — own funds shown as ₹0").

### 3.2 Mobile
Tabs scroll horizontally; tables become labelled cards (`stack-mobile`); charts full width; touch targets ≥ 44px.

## 4. Tagging UI
- **Income form** (Income page): optional *Project* select. Income list shows a project chip.
- **Loan → Project allocation dialog** (`LoanProjectAllocationModal`): rows of *Project select + Amount*, "Add project", remaining-to-allocate hint (loan original principal − Σ), default amount = remaining. Save replaces the loan's allocations. Opened from the Loan card/detail ("Project funding") and from Transactions.
- **Transactions**: Project column + chip; *Tag* action opens the income select or the allocation dialog; Project filter (All / project / Untagged).

## 5. Hub Project Card (Expenses → Projects)
Name, type chip, **Total invested**, cost per sq ft (or avg per item), **Funded by loans** (₹ and %), **income per month**, **Gross yield**, entries count, last activity. Fields without data are omitted, not shown as zero.

## 6. Accessibility & Responsiveness
Charts have an `aria-label` summary and a "View as table" fallback (the linked tables); status is never colour-only; dark mode uses the existing token set (no undefined Tailwind shades).

## Update 2026-10-19 — Project at a glance
- The *Own funds* KPI is replaced by **Total income received** (accumulated receipts and one-off income, with % of cost recovered).
- A full-width **Project at a glance** bar chart sits above the other charts: total invested (asset cost), current market value (when set), income received, interest paid on loans and loan still outstanding, each with a direct ₹ label. It is also in the *View chart data as a table* section.
