# Design Spec 08 — Unified Statement of Transactions

**Companion to:** SDD-Family-Wealth-Manager.md §4.8, §8
**Shared tokens/components:** see Design-Spec-00-Foundations.md

---

## 1. Overview & Purpose
The **Statement of Transactions** provides a unified, chronological ledger of all cashflow events across the entire family portfolio, sorted strictly **latest first**. It aggregates inflows and outflows from all modules into a single searchable, filterable financial passbook:
- Inflows are displayed in **green** with a prominent **`+`** prefix.
- Outflows / Debt servicing payments are displayed in **rose / red** with a prominent **`-`** prefix.

---

## 2. Information Architecture & Navigation
- **Route:** `/transactions`
- **Sidebar Navigation:** Prominent item in the primary sidebar (positioned between **Expenses** and **Insurance**, with an `ArrowLeftRight` / `Receipt` icon).
- **Responsive Navigation:** Available on mobile via navigation drawer and top bar.

---

## 3. Supported Transaction Types & Sources

| Category | Source Event | Amount Sign & Color | Badge / Type Label | Date Tracked | Primary Details / Subtitle |
|---|---|---|---|---|---|
| **Income (One-Off)** | Added in Income module with `recurrence=one_off` | **`+` Green** | `One-Off Income` | `start_date` / creation date | Income label, currency, optional notes |
| **Income (Recurring Arrival)** | Confirmed via Monthly Action Queue / Reminders / `confirmReceipt` | **`+` Green** | `Recurring Income` | `received_date` (arrival date) | Income label + "Monthly Arrival", confirmed variance if any |
| **Household Expense** | Logged in Expenses module (`source=manual`) | **`-` Red** | `Expense` (Category name) | Expense `date` | Expense category, notes, currency |
| **Insurance Premium** | System-queued or logged insurance expense (`source=insurance_auto`) | **`-` Red** | `Insurance Premium` | Premium due/paid `date` | Policy provider, policy number, notes |
| **Loan EMI Paid** | Loan `RepaymentInstallment` marked `is_paid=true` (from Loan Detail, Home Action Queue, or Expense sync) | **`-` Red** | `Loan EMI` | `paid_date` (or `due_date`) | Loan name, lender, Installment #N (with principal & interest split) |
| **Loan Part-Payment** | Prepayment recorded on loan (`PrepaymentRecord`) | **`-` Red** | `Part-Payment` | Prepayment `date` | Loan name, lender, tenure reduction / EMI reduction mode |
| **Gold Loan Payment** | Cash payment logged on jewel/gold loan ledger | **`-` Red** | `Gold Payment` | Payment `date` | Gold loan name, lender, interest saved note |

---

## 4. UI Layout & Controls

### 4.1 Top KPI Summary Strip
Four responsive metric cards reflecting the currently filtered time range and criteria:
1. **Total Inflow (`+`)**: Sum of all confirmed incomes in base currency (emerald text with `+` sign).
2. **Total Outflow / Debt (`-`)**: Sum of all expenses, paid EMIs, part-payments, and gold payments in base currency (rose text with `-` sign).
3. **Net Cash Flow**: `Total Inflow - Total Outflow`, with clear surplus (emerald) or deficit (rose) badge and indicator.
4. **Transaction Count**: Total count of transactions in the selected view.

### 4.2 Filter & Search Bar
- **Duration Quick Filters**:
  - `1 Month` (Default: current month or trailing 30 days)
  - `Quarterly` (Trailing 3 months / current quarter)
  - `Yearly` (Trailing 12 months / current year)
  - `All Time` / Custom range picker
- **Flow Filter Toggle**:
  - `All Transactions`
  - `Inflow (+)` (Incomes only)
  - `Outflow / Debt (-)` (Expenses, EMIs, Prepayments, Gold loan payments)
- **Category / Source Dropdown**: Filter by specific origin (`All`, `Income`, `Expense`, `Loan EMI`, `Part-Payment`, `Gold Payment`).
- **Member Scope Toggle**: `Whole Family` vs. `Just Me` (or individual member selector).
- **Search Input**: Live debounce search by title, lender, note, category name, or amount.

### 4.3 Transactions Table
- **Columns**:
  1. **Date**: Formatted date (e.g. `06 Oct 2026`) with time/relative day helper.
  2. **Transaction & Notes**: Bold title (e.g. "Salary", "HDFC Home Loan - EMI #14", "Electricity Bill"), sub-line showing notes, installment breakdown, or receipt details.
  3. **Type & Category**: Color-coded pill badge indicating the transaction nature.
  4. **Member**: Display name of the member associated with the transaction.
  5. **Amount**:
     - Inflows: Bold mono emerald, prefixed with `+` (e.g. `+ ₹1,50,000`).
     - Outflows: Bold mono rose, prefixed with `-` (e.g. `- ₹42,500`).
- **Empty State**: Friendly illustration with copy: "No transactions found for the selected time range and filters."

---

## 5. API Specification

### Endpoint: `GET /api/v1/transactions`
- **Guards:** `JwtAuthGuard`, `ActiveMemberGuard`, `FamilyScopeGuard`
- **Query Parameters**:
  - `memberId` (optional, string)
  - `duration` (optional: `1m` | `quarterly` | `yearly` | `all`, default: `1m`)
  - `startDate` (optional ISO date string)
  - `endDate` (optional ISO date string)
  - `flow` (optional: `all` | `inflow` | `outflow`, default: `all`)
  - `source` (optional: `all` | `income` | `expense` | `loan_emi` | `prepayment` | `gold_payment`)
  - `search` (optional string)
- **Response Shape**:
```json
{
  "summary": {
    "totalInflow": "150000.00",
    "totalOutflow": "65000.00",
    "netCashFlow": "85000.00",
    "currency": "INR",
    "count": 14
  },
  "transactions": [
    {
      "id": "tx-123",
      "date": "2026-10-06T10:00:00.000Z",
      "flow": "inflow",
      "type": "income_one_off",
      "typeLabel": "One-Off Income",
      "title": "Consulting Bonus",
      "subtitle": "Q3 Performance bonus",
      "amount": "50000.00",
      "currency": "INR",
      "memberId": "mem-1",
      "memberName": "Anbuselvam",
      "sourceEntity": "income",
      "entityId": "inc-456"
    }
  ]
}
```

---

## 8. Project Tagging (added 2026-10-19)
- A **Project** column shows a chip with the project name for tagged income and loan rows; untagged income/loan rows show a dashed "+ Tag project" chip. Household expenses and insurance rows are not taggable.
- **Tagging edits the source**, not the single row: for income rows it sets `IncomeEntry.project_id` (all receipts of that stream follow); for loan rows it opens the **Loan → Project allocation** dialog (one loan may fund several projects, each with an amount). The dialog states this explicitly.
- A **Project** filter (All / each project / Untagged) joins the existing filters. Mobile: the chip appears as a labelled row in the stacked card.

## 9. Edit & Delete (added 2026-10-19)
- A trailing **Actions** column holds an Edit (pencil) and a Delete-style (trash) button per row, 44px touch targets; on mobile they appear in the stacked card's action row. Rows that cannot be changed show the reason instead (insurance premiums: managed from Insurance).
- The destructive action is named for what it does to the source: *Delete income*, *Undo receipt*, *Delete expense*, *Mark EMI unpaid*, *Delete payment*. The confirmation dialog states the effect (e.g. "The month goes back to pending in the home-page reminders").
- Edit fields by type: one-off income (name, amount, date); recurring receipt (amount, received date, notes); household expense (amount, date, notes); loan EMI (paid on). Loan part-payments and gold-loan payments are delete-only (delete and re-add to change).
- Changes apply to the source record, then the statement and its summary strip reload.

