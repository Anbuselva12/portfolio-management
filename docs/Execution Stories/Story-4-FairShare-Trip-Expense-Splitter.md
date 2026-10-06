# Story 4 — FairShare: Trip & Event Group Expense Splitter

**Companion documents:** SDD-Family-Wealth-Manager.md (§4.10), Design-Spec-00-Foundations.md, Design-Spec-10-FairShare.md

**Goal:** An independent group expense splitting application (FairShare) within the FinFamily multi-app ecosystem that allows users to manage shared expenses for trips, vacations, and social events with first-class Household units, registered and guest participants, multi-mode split allocation, two-pointer greedy debt simplification ("Who Pays Whom"), 1-click WhatsApp copy, and multi-tab Excel export.

---

## Scope

### 1. Data Models & Tenant Boundary
- `FairShareTrip`: Independent trip tenant (`id`, `title`, `description`, `location`, `start_date`, `end_date`, `currency`, `default_split_mode`, `settlement_rollup`, `status`, `created_by_id`).
- `FairShareHousehold`: Household / family units (`id`, `trip_id`, `name`, `color_token`, `notes`).
- `FairShareParticipant`: Individuals (`id`, `trip_id`, `household_id`, `name`, `is_guest`, `member_id`, `phone_number`, `avatar_url`).
- `FairShareExpense`: Shared expenses (`id`, `trip_id`, `title`, `category`, `amount`, `paid_by_participant_id`, `split_mode`, `expense_date`, `receipt_url`, `notes`).
- `FairShareExpenseSplit`: Line-item breakdown (`id`, `expense_id`, `participant_id`, `share_amount`, `percentage_share`).
- `FairShareSettlement`: Verified settlement payments (`id`, `trip_id`, `payer_id`, `payee_id`, `amount`, `paid_at`, `notes`).

### 2. Core Business Logic & Algorithmic Engines
- **Balance Aggregator**: Computes individual contributed ($C_i$) and owed ($O_i$) amounts, deriving net balance ($B_i = C_i - O_i$).
- **Household Rollup**: Sums balances across household members when `settlement_rollup = 'household'`.
- **Greedy Debt Simplification**: Two-pointer algorithm sorting debtors and creditors, matching opposite balances in $O(N \log N)$ to produce minimal payments ($\le N-1$).
- **WhatsApp Generator**: Formats trip header, summary stats, chronological expense roll, and final settlement checklist into WhatsApp markdown.
- **Excel/CSV Export**: Emits complete itemized ledger and participant balances.

### 3. Frontend Views & Workspaces
- **App Switcher & Navigation**: FairShare registered in the top App Switcher and persistent sidebar.
- **Trips Hub (`/fairshare`)**: Grid of active and past trips with status badges, dates, total spend, net balance, and "+ New Trip" modal.
- **Trip Detail Workspace (`/fairshare/trips/:id`)**:
  - Top KPI strip: Total Spend, Net Balance, Top Contributor, Settlement Status.
  - Action buttons: "+ Add Expense", "📋 Copy for WhatsApp", "📥 Export Excel", Rollup Toggle ("Household" vs "Individual").
  - Tab 1: **Expenses Log** (Timeline view, date headers, search/filter, Add/Edit expense drawer).
  - Tab 2: **Balances & Settlement** (Bar balance indicators, "Who Pays Whom" cards, "Mark Paid" modal).
  - Tab 3: **Households & Participants** (Family groups, participant cards, guest claim workflow).

---

## Definition of Done
1. Trips can be created with dates, location, currency, default split mode, and settlement rollup.
2. Participants can be added with or without households, and can be registered platform members or guest accounts.
3. Expenses can be recorded with flexible split modes (Equally by headcount, Equally by household, Custom percentage, Specific subset).
4. Balances can be viewed and toggled seamlessly between Household and Individual levels at any time.
5. The Debt Simplification Engine produces minimal cross-payments for any group configuration.
6. "Copy for WhatsApp" copies a clean, emoji-formatted message to the clipboard with visual confirmation.
7. Excel export downloads a valid file with summary and itemized expenses.
8. Zero access is granted to FinFamily wealth portfolios from FairShare trips, preserving tenant isolation.
