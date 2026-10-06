# Design Spec 09 — Multi-App Platform & Modular Expense Tracker

## 1. Overview & Context

This design specification establishes a **Multi-Application Platform** within FinFamily, inspired by enterprise platforms like Appian. It allows users to toggle seamlessly between independent applications via a top-left application launcher:

1. **FinFamily**: Personal & Family Wealth Manager (Net Worth, Assets, Income, Loans, Strategies, Household Expenses, Statement).
2. **Expense Tracker**: High-granularity project & commercial procurement tracker (e.g., Construction, Retail Business, Interior Renovations), featuring multi-phase project tracking, procurement metrics, material quantity accounting, and interactive phase/cost analytics.

Historical construction procurement data from `/Expense App SQL Files/` is ingested and mapped to an initial project named **"SK Complex"** associated with member `0ca74094-1719-4b82-91ec-8108878fb177` and family `101b1ffa-9d7c-44f2-a161-dbfe87a2f230`.

---

## 2. Multi-App Architecture & Application Switcher

### 2.1 Top-Left App Switcher (Appian-Style)
In the navigation header / brand bar:
- A clickable application menu (waffle / app launcher or dropdown) displays available applications:
  - **FinFamily** — Personal Wealth & Debt Management
  - **Expense Tracker** — Project & Commercial Expense Manager
- Clicking an application instantly switches the workspace, updating the sidebar links, breadcrumbs, and active route context (`/dashboard` vs `/tracker`).
- State is preserved across reloads.

### 2.2 User-Specific Preferred Default App
- Under **Settings → My Profile** (and Admin settings), a new field **Preferred App** (`preferred_app: 'finfamily' | 'expense_tracker'`) is stored per user.
- On login or root navigation (`/`), the user is routed to their preferred default application.

---

## 3. Expense Tracker Information Architecture

```
Expense Tracker (/tracker)
├── Projects / Category Hub (/tracker)
│   ├── Grid of Project Cards ("SK Complex", "Retail Business", etc.)
│   ├── Summary KPIs per Card (Total Spend, Phase Count, Item Count)
│   └── "+ New Project / Category" Modal Action
│
├── Project Detail & Workspace (/tracker/projects/:id)
│   ├── Header KPI Strip:
│   │   ├── Total Spend (₹)
│   │   ├── Price per Sq Ft (e.g. ₹2,660.55 for 3,058 sq ft) OR Alternative Unit KPI (Avg Spend per Entry)
│   │   ├── Active / Dominant Phase
│   │   └── Total Procurement Items Count
│   │
│   ├── Action: "+ Add New Expense" Drawer
│   │
│   ├── Tab 1: Expenses Log (Data Table)
│   │   ├── Instant search (by item name, brand, description)
│   │   ├── Phase dropdown filter (Basement, Lindal, Roof, Finishing, Labour)
│   │   ├── Tag dropdown filter (Steels, Bricks, Cement, M Sand, etc.)
│   │   ├── Granular columns: ID, Date, Expense Type, Product Name, Brand, Quantity, Unit, Rate per Unit, Total Cost, Phase, Tag
│   │   └── Actions: Edit, Delete, Duplicate
│   │
│   ├── Tab 2: Reports & Analytics
│   │   ├── Price by Phase (Summary card list + Stacked horizontal Bar Chart)
│   │   ├── Percentage of Expense (Interactive Donut Chart with Tag colors)
│   │   ├── Quantity by Expense Material (Bricks pieces, Cement bags, Sand units)
│   │   ├── Price by Expense list with phase filter dropdown
│   │   └── "Show Labour Cost" Toggle (filters out labor from charts to inspect pure material distribution)
│   │
│   └── Tab 3: Project Configuration
│       ├── Edit Project Metadata (Name, Total Area Sq Ft, Description)
│       ├── Custom Phases Management
│       ├── Custom Expense Types Management
│       ├── Custom Tag Items Management (with Hex color picker)
│       └── Custom Units of Measurement
```

---

## 4. Domain Data Model

```prisma
model TrackerProject {
  id              String   @id @default(uuid())
  family_id       String
  created_by_id   String
  name            String   // e.g. "SK Complex"
  code            String?  // e.g. "construction"
  description     String?
  total_area_sqft Decimal? // e.g. 3058.00 (optional)
  currency        String   @default("INR")
  is_active       Boolean  @default(true)
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  family       Family               @relation(fields: [family_id], references: [id])
  creator      Member               @relation(fields: [created_by_id], references: [id])
  phases       TrackerPhase[]
  types        TrackerExpenseType[]
  tags         TrackerTagItem[]
  expenses     TrackerExpense[]
}

model TrackerPhase {
  id         String   @id @default(uuid())
  project_id String
  name       String   // e.g. "Basement", "Lindal", "Roof", "Final Finishing", "Labour"
  sort_order Int      @default(0)
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())

  project  TrackerProject   @relation(fields: [project_id], references: [id], onDelete: Cascade)
  expenses TrackerExpense[]
}

model TrackerExpenseType {
  id         String   @id @default(uuid())
  project_id String
  name       String   // e.g. "Bricks", "Cement", "Steels 10 mm", "Labour Cost"
  sort_order Int      @default(0)
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())

  project  TrackerProject   @relation(fields: [project_id], references: [id], onDelete: Cascade)
  expenses TrackerExpense[]
}

model TrackerTagItem {
  id         String   @id @default(uuid())
  project_id String
  name       String   // e.g. "Steels", "Cement", "Labour Cost"
  hex_color  String?  // e.g. "#6E7B8B"
  sort_order Int      @default(0)
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())

  project  TrackerProject   @relation(fields: [project_id], references: [id], onDelete: Cascade)
  expenses TrackerExpense[]
}

model TrackerUnit {
  id         String   @id @default(uuid())
  name       String   // e.g. "Kg", "Unit", "Piece", "Bundle", "1 Bag", "Time (Hours)", "Driver"
  sort_order Int      @default(0)
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())

  expenses TrackerExpense[]
}

model TrackerExpense {
  id              String   @id @default(uuid())
  project_id      String
  expense_type_id String?
  product_name    String?
  brand           String?
  description     String?
  quantity        Decimal
  price_per_qty   Decimal
  unit_id         String?
  is_exception    Boolean  @default(false)
  total_cost      Decimal
  project_phase_id String?
  tag_item_id     String?
  purchase_date   DateTime
  created_by_id   String?
  is_active       Boolean  @default(true)
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  project      TrackerProject      @relation(fields: [project_id], references: [id], onDelete: Cascade)
  expense_type TrackerExpenseType? @relation(fields: [expense_type_id], references: [id])
  unit         TrackerUnit?        @relation(fields: [unit_id], references: [id])
  phase        TrackerPhase?       @relation(fields: [project_phase_id], references: [id])
  tag_item     TrackerTagItem?     @relation(fields: [tag_item_id], references: [id])
  created_by   Member?             @relation(fields: [created_by_id], references: [id])
}
```

---

## 5. Calculations & Analytics Contract

1. **Total Expenditure**: Sum of all `total_cost` where `is_active == true`.
2. **Price per Sq Feet**:
   $$\text{Price per Sq Ft} = \frac{\text{Total Expenditure}}{\text{total\_area\_sqft}}$$
   If `total_area_sqft` is not defined, substitute with:
   $$\text{Avg Cost per Item} = \frac{\text{Total Expenditure}}{\text{Total Procurement Items}}$$
3. **Price by Phase**: Aggregates `total_cost` grouped by `phase_id` / `phase.name`.
4. **Percentage of Expense (Donut Chart)**: Aggregates `total_cost` grouped by `tag_item_id` / `tag.name`, formatted with percentage share and assigned HEX colors.
5. **Quantity by Expense**: Aggregates `quantity` and unit grouped by material expense type.
6. **Labour Cost Exclusion Toggle**: When `includeLabour == false`, expenses tagged under "Labour Cost" or phase "Labour" are filtered out from the phase/tag charts so material expenses are not overshadowed by high labor totals.

---

## 6. Initial Seed / Migration ("SK Complex")

- Project Name: **"SK Complex"**
- Family ID: `101b1ffa-9d7c-44f2-a161-dbfe87a2f230`
- Member ID: `0ca74094-1719-4b82-91ec-8108878fb177`
- Area: `3,058 sq ft` (139 × 22)
- Seeded Data:
  - 6 Project Phases (`Basement`, `Lindal`, `Roof`, `Final Finishing`, `Extra Items`, `Labour`)
  - 22 Expense Types (`Bricks`, `Jalli`, `Cement`, `Steels 10mm`, etc.)
  - 7 Units of Measure (`Kg`, `Unit`, `Piece`, `Bundle`, `1 Bag`, `Time (Hours)`, `Driver`)
  - 16 Tag Items with respective Hex Colors (`#6E7B8B`, `#B22222`, etc.)
  - 272 Purchase Transactions (Total Cost: ₹81,35,982.22; Unit Cost: ₹2,660.55 / sq ft).
