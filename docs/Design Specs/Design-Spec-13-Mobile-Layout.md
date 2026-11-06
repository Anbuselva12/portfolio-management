# Design Spec 13 — Mobile Layout (< 768px)

Desktop and tablet (≥ 768px) are unchanged. Below `md`:

## Shell
- **Top bar** (56px + safe area): FinFamily brand (links to Dashboard) and the account avatar (links to Settings → Profile).
- **Bottom tab bar** (64px + safe area), five slots: Home, Loans, Expenses, Statement (`/transactions`), **More**.
- **More** opens a bottom sheet (`MobileMoreSheet`): signed-in user, a 3-column grid of every destination (same list as the sidebar, from `navLinks.ts`), and Log out. Closes on route change, backdrop tap, close button or Esc. The Members & Access badge (pending join requests) shows on the tile and as a dot on **More**.
- Page content has `pb-28` so nothing hides behind the tab bar; the scroll container (`#app-main`) resets to the top on route change.

## Overlays
- All modals and drawers render through `components/ui/Portal.tsx` (under `<body>`), so page stacking contexts can never place them beneath the fixed header or tab bar.
- Modals are bottom-aligned sheets on phones (`items-end sm:items-center`), capped at `92dvh`, scrolling internally.
- Inputs are 16px on phones to prevent iOS zoom on focus.

## Home (Dashboard)
`MobileHome` replaces the KPI strip and quick-action cards on phones:
1. Net-worth hero card with month-on-month change and savings chip.
2. Pending-tasks banner (jumps to the Monthly Action Queue) when reminders are outstanding.
3. 2×2 metric tiles: Assets, Debt, Inflow / mo, Outflow / mo.
4. Four quick-link tiles: Assets, Loans, Income, Expenses.
Charts, reminders and the payoff timeline follow unchanged.

## Retired
FairShare and the App Switcher (2026-11-06). Run `backend/prisma/manual-migrations/20261106_remove_fairshare.postgres.sql` to drop its tables.

## List screens (added 2026-11-06)
Phones favour dense rows over cards; desktop/tablet markup is untouched (changes sit behind `max-md:` / `md:hidden`).
- **Table rows (`table.stack-mobile`)**: one compact row — primary cell (no `data-label`) and the `Amount` / `Value` cell on line 1, remaining labelled cells inline on line 2, `data-actions` pushed right. Add `stack-labeled` to show small column names inline (used by the amortization schedule). `max-md:hidden` on a cell still hides it. Used by Statement, Expenses, Income, Assets, Audit Trail and the loan schedule.
- **Statement**: no duplicated outer padding; KPI strip is Inflow / Outflow plus a full-width Net card; filters collapse behind a filter button next to search; type badge and (for solo workspaces) member are hidden.
- **Expenses / Income / Projects**: header actions share one row; tabs and month/category filters fill the width.
- **Loans**: `LoanRowsMobile` list (name, outstanding, lender · rate, EMI, repaid bar, months left, tag and delete icons). Row tap opens the loan summary. The card grid is used from `md` up.
- **Loan detail**: action buttons scroll in a single row, compact KPI tiles, schedule as rows.
- **Home**: "Your loans" sits directly under the quick links; every row (and, on desktop, every payoff-timeline card) links to `/loans/:id`. The dashboard analytics now returns the loan `name` for each payoff-timeline item.
- **Insurance**: tighter cards without the helper lines.
- Page titles use one size below 768px.
