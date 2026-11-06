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
