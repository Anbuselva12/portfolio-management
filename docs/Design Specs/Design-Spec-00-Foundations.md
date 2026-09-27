# Design Spec 00 — Foundations
## Design System, Information Architecture & Shared Components

**Companion to:** SDD-Family-Wealth-Manager.md (§16)
**Used by:** all other Design Spec documents in this set — they reference this file for shared tokens/components instead of repeating them.

---

## 1. Design Principles
1. **Clarity over density** — this is money; every number must be unambiguous (currency, sign, period) even if it means fewer numbers per screen.
2. **Family-first, member-aware** — the default view is the shared family picture; individual member data is one click away, never hidden but never the default noise.
3. **Comparable by design** — anywhere the app offers more than one way to do something (repayment strategies, payoff timelines), show them **side-by-side**, not as a single "best" answer, so the user can decide.
4. **Reversible confidence** — calculators (prepayment "what-if", strategy comparison) always preview before committing; nothing silently changes real records.
5. **Calm data visualization** — no gratuitous 3D/animation on financial charts; color always carries meaning (green=surplus/asset, red=liability/deficit, amber=warning/discrepancy), never decoration alone.

---

## 2. Information Architecture

```
├── Login
├── Register (username/password only)
├── Family Selection (Create New | Join Existing)  — see Design-Spec-01
├── Pending-Approval Holding Screen                — see Design-Spec-01
├── Dashboard (Family, default)  |  toggle → Dashboard (My view)     — Design-Spec-02
├── Assets                                                            — Design-Spec-03
├── Income                                                            — Design-Spec-03
├── Loans                                                              — Design-Spec-04
│   ├── Loan List / Detail / Repayment Schedule
│   └── Prepayment Calculator
├── Debt Strategy Comparison                                          — Design-Spec-05
├── Expenses                                                          — Design-Spec-06
├── Insurance                                                         — Design-Spec-06
├── Audit Trail                                                       — Design-Spec-07
└── Settings                                                          — Design-Spec-07
    ├── Family Settings
    ├── Members & Access / Pending Requests (Admin)
    └── My Profile
```

Primary navigation: **left sidebar** (desktop) collapsing to a **bottom tab bar** (mobile): Dashboard, Assets, Income, Loans, Expenses, Insurance, Settings. Audit Trail lives under Settings (least-frequently used, per requirement).

---

## 3. Component Library (Key Reusable Components)
| Component | Used In | Notes |
|---|---|---|
| `KpiCard` | Dashboard | value, delta, trend arrow, currency-aware formatter |
| `DonutChart` / `LineChart` / `StackedBarChart` / `GanttTimeline` | Dashboard, Strategy Comparison | Recharts-based, consistent color tokens |
| `DataTable` (editable cell mode) | Repayment Schedule, Audit Trail | virtualized scroll for large row counts |
| `SlideDrawer` | Asset/Income/Expense add-edit | consistent right-side drawer pattern, becomes full-screen sheet on mobile |
| `StrategyCard` | Strategy Comparison | allocation table + metrics + CTA, reusable shape for all strategy types |
| `CurrencyInput` | all monetary forms | shows currency selector + formatted numeric input, decimal-safe |
| `DiscrepancyBanner` | Loan Detail | amber alert pattern, reused for any validation warnings |
| `EmptyState` | any list with 0 records | icon + short copy + primary CTA |
| `ConfirmDialog` | delete/stop actions | consistent "this can be restored/undone" messaging |
| `PendingBadge` | Nav, Members list | small amber counter badge for pending-approval items (Admin) |

---

## 4. Visual Design System

### 4.1 Color Tokens
| Token | Use | Example |
|---|---|---|
| `--color-positive` | assets, surplus, savings, "money saved" | deep green |
| `--color-negative` | liabilities, deficit, overdue | deep red |
| `--color-warning` | discrepancies, penalties, due-soon, pending-approval | amber |
| `--color-neutral-primary` | primary text, key numbers | near-black / near-white (dark mode) |
| `--color-accent` | primary actions, active nav, links | calm blue/teal (kept distinct from red/green financial semantics) |
| Loan-type palette | consistent per loan type across all charts (Home, Car, Personal, Jewel, Education, Other each get a fixed hue) | so a user learns "blue = home loan" everywhere |

Light and dark mode both supported; charts must maintain positive/negative/warning semantics in both.

### 4.2 Typography
- Clean, highly legible sans-serif (e.g., Inter). Tabular/lining numerals for all monetary tables so digits align in columns.
- Large KPI numbers: bold, generous size, minimal decoration.
- Monetary values always formatted with currency symbol/code + locale grouping (₹1,23,456 for INR).

### 4.3 Layout & Responsiveness
- **Desktop (≥ 1024px)**: Full persistent left sidebar, multi-column KPI strip (6 cards), 2-3 column chart areas, full data tables.
- **Tablet / iPad (640px – 1023px)**:
  - Adaptive 2-column and 3-column grids.
  - Sidebar can be collapsed or toggled.
  - Dashboard charts stack into comfortable 2-column or full-width layouts.
  - Slide drawers occupy 50–60% width with touch-friendly controls.
- **Mobile (< 640px)**:
  - **Mobile AppShell Navigation**: Responsive header with hamburger menu button that opens a slide-over navigation drawer with backdrop overlay.
  - **KPI Strip**: Formatted as a 2-column responsive grid with compact typography to eliminate horizontal page squishing.
  - **Responsive Data Lists / Tables**: Wide tables (Income, Assets, Expenses, Insurance, Loans) adapt with horizontal scroll wrappers and compact card views so no action buttons or dates are clipped.
  - **Drawers & Modals**: Slide drawers (`SlideDrawer`) and dialogs expand to full screen (`w-full`) on mobile with sticky footer action buttons.
  - **Touch Targets**: Minimum 44×44px interactive tap targets for all action buttons (Delete, Edit, Confirm, Pay).

---

## 5. Interaction & Feedback Patterns
- **Optimistic UI** for simple edits (Expense/Income/Asset CRUD) with toast confirmation and silent rollback+error toast on failure.
- **Explicit confirm-before-apply** for anything that regenerates a loan schedule (Prepayment apply, Loan terms edit) — never optimistic, always a clear preview + "Apply"/"Save" step.
- **Loading/skeleton states** for dashboard charts while aggregation queries run.
- **Discrepancy/warning banners** are dismissible but reappear if the underlying condition persists on next visit.

---

## 6. Accessibility Notes
- All charts paired with an accessible data-table toggle ("View as table") for screen-reader users and precise number-reading.
- Color is never the sole indicator — icons/labels accompany all green/red/amber cues (e.g., ↑/↓ arrows plus color on KPI deltas).
- Minimum contrast ratio 4.5:1 for text, 3:1 for large text/UI components, verified in light and dark themes.
- All interactive elements keyboard-navigable with visible focus states; modals/drawers trap focus and return it on close.

---

## 7. Suggested Build Sequencing (maps to SDD modules)
1. Auth + Family/Member management + Settings shell (Design-Spec-01, 07)
2. Assets + Income CRUD + basic Dashboard KPIs, no charts yet (Design-Spec-03, 02)
3. Loan engine + Loan Detail/Schedule UI (Design-Spec-04)
4. Prepayment Calculator (Design-Spec-04)
5. Expenses + Insurance incl. auto-expense linkage (Design-Spec-06)
6. Full Dashboard charts (Design-Spec-02)
7. Repayment Strategy Engine + Comparison UI (Design-Spec-05)
8. AI Suggestion (Gemini) strategy integration (Design-Spec-05)
9. Audit Trail + restore functionality (Design-Spec-07)
10. Multi-member polish + local-storage/server-mode parity testing
