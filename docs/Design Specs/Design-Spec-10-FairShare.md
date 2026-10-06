# Design Spec 10 — FairShare (Trip & Group Shared Expense Tracker)

---

## 1. Executive Summary & Purpose

**FairShare** is a modular group expense sharing application integrated within the multi-application platform alongside **FinFamily** and **Expense Tracker**. 

Designed to replicate and upgrade the core experience of tools like Splitwise, FairShare introduces first-class **Household / Multi-Family Unit grouping** for shared vacations, office outings, group events, and dinner parties.

### Core Value Propositions:
1. **Strict Family Data Isolation**: Trips exist in their own isolated security boundary (`FairShareTrip`). Registered members or guest participants invited to a trip have **zero visibility or authorization** over FinFamily assets, incomes, loans, or other private family workspaces.
2. **First-Class Household / Family Support**:
   - Supports multi-family outings (e.g. Household 1: Anbu & Gayathri; Household 2: Saminathan & Sheela; Household 3: Anand & Sorubini).
   - If either spouse contributes (pays for travel, food, lodging), payments roll up automatically to their family unit's balance.
   - Dynamic switchable views: Toggle between **"Household / Family View"** and **"Individual View"** at any point in time.
3. **Flexible Split Modes**:
   - **Equal by Headcount**: Total divided evenly among all participating individuals.
   - **Equal by Family Unit**: Total divided evenly among participating household units (e.g., 1/3 per family).
   - **Custom Percentage / Weights**: Pre-defined split ratios (e.g. 20%, 30%, 50% = 100% total).
   - **Per-Expense Granular Overrides**: Exclude specific families/individuals from an activity or specify exact rupee allocations.
4. **Greedy Debt Simplification Algorithm**:
   - Minimizes the number of bilateral settlements required to balance all accounts.
   - Eliminates back-and-forth ping-pong payments (e.g. reducing 15 confusing transfers down to 2 or 3 clean direct payments).
5. **Instant WhatsApp Summary Generator**:
   - Generates a cleanly formatted, emoji-styled WhatsApp summary with day-by-day itemization and final settlement instructions ready to paste into group chats with one click.
6. **Multi-Tab Excel Export**:
   - Downloads a structured `.xlsx` or `.csv` containing a Summary Sheet (balances + "Who Pays Whom") and an Itemized Expenses Log.

---

## 2. Information Architecture & Navigation

```
FairShare Workspace (/fairshare)
├── App Switcher Entry: Accessible via top-left App Launcher dropdown (FinFamily | Expense Tracker | FairShare)
│
├── Trips Hub (/fairshare)
│   ├── Grid of Trip Cards (Upcoming, Ongoing, Settled)
│   ├── Trip Badges (Location, Duration in Days, Participant Count, Total Spend, Settlement Status)
│   └── "+ New Trip" Modal (Title, Dates, Location, Currency, Default Split Rule, Household/Individual mode)
│
├── Trip Detail Workspace (/fairshare/trips/:id)
│   ├── Header Bar & Controls:
│   │   ├── Title, Location, Dates, Duration badge
│   │   ├── Mode Switcher: [Households / Families] vs [Individuals]
│   │   ├── Action: "+ Add Expense" Drawer
│   │   ├── Action: "📋 Copy for WhatsApp" Button (with instant clipboard feedback)
│   │   └── Action: "📥 Export Excel" Button
│   │
│   ├── Header KPI Strip:
│   │   ├── Total Trip Spend (₹)
│   │   ├── Your Net Balance (Green "You get back ₹X" / Red "You owe ₹Y" / Grey "Settled")
│   │   ├── Top Contributor / Payer
│   │   └── Settlement Status (Pending vs Fully Balanced)
│   │
│   ├── Tab 1: Expenses Log (Chronological Activity Feed)
│   │   ├── Grouped by Day (Day 1, Day 2, Day 3)
│   │   ├── Expense Card / Row: Category icon, Title, Amount (₹), Paid by, Split details
│   │   ├── Search bar & Category filter dropdown
│   │   └── Edit / Delete actions with recalculation
│   │
│   ├── Tab 2: Balances & Settlement ("Who Pays Whom")
│   │   ├── Visual Net Balance Bars (Positive = Creditor / Negative = Debtor)
│   │   ├── Simplified Settlement Route Cards:
│   │   │   ├── e.g. "Saminathan Family pays ₹3,200 ➔ Anbu Family"
│   │   │   ├── Action: "Mark as Settled / Record Payment" modal
│   │   │   └── Payment method (UPI, Cash, Bank Transfer) with receipt notes
│   │   └── Settlement History Log
│   │
│   └── Tab 3: Household Units & Participants
│       ├── Household / Family Unit manager (Add/Edit household names)
│       ├── Participants list:
│       │   ├── Registered users (linked account)
│       │   └── Guests (managed on their behalf by trip creator)
│       └── Invite / Claim Guest Profile workflow
│
└── Settings & Profile (/fairshare/settings)
    ├── User Profile details & Default Landing Application preference
    ├── Password change & credentials
    └── Scoped strictly to FairShare context (retains FairShare sidebar)
```

---

## 3. Domain Data Model (Prisma)

```prisma
// ─── FairShare Trip Models ──────────────────────────────────────────────────

model FairShareTrip {
  id                 String   @id @default(uuid())
  created_by_id      String
  title              String   // e.g. "Ooty Weekend Trip"
  description        String?
  location           String?  // e.g. "Ooty, Tamil Nadu"
  start_date         DateTime?
  end_date           DateTime?
  duration_days      Int      @default(1)
  currency           String   @default("INR")
  default_split_mode String   @default("equal_headcount") // equal_headcount | equal_family | custom_percentage
  settlement_level   String   @default("family")          // family | individual
  is_settled         Boolean  @default(false)
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt

  creator            Member                    @relation(fields: [created_by_id], references: [id])
  households         FairShareHousehold[]
  participants       FairShareParticipant[]
  expenses           FairShareExpense[]
  settlements        FairShareSettlement[]
}

model FairShareHousehold {
  id                 String   @id @default(uuid())
  trip_id            String
  name               String   // e.g. "Anbu Family", "Saminathan Family"
  sort_order         Int      @default(0)
  default_share_pct  Decimal? // Optional predefined percentage (e.g. 33.33)
  created_at         DateTime @default(now())

  trip               FairShareTrip            @relation(fields: [trip_id], references: [id], onDelete: Cascade)
  participants       FairShareParticipant[]
  splits             FairShareExpenseSplit[]
}

model FairShareParticipant {
  id                 String   @id @default(uuid())
  trip_id            String
  household_id       String?  // Optional link to a household
  member_id          String?  // Optional link to registered Member account
  display_name       String   // e.g. "Anbu", "Gayathri", "Guest Friend"
  is_guest           Boolean  @default(true)
  email              String?
  phone              String?
  created_at         DateTime @default(now())

  trip               FairShareTrip            @relation(fields: [trip_id], references: [id], onDelete: Cascade)
  household          FairShareHousehold?      @relation(fields: [household_id], references: [id], onDelete: SetNull)
  member             Member?                  @relation(fields: [member_id], references: [id], onDelete: SetNull)
  paid_expenses      FairShareExpense[]
  splits             FairShareExpenseSplit[]
}

model FairShareExpense {
  id                    String   @id @default(uuid())
  trip_id               String
  payer_participant_id  String
  title                 String   // e.g. "Tempo Traveller Van", "Dinner & Campfire"
  amount                Decimal
  category              String   @default("general") // travel | food | stay | activities | shopping | general
  expense_date          DateTime
  day_number            Int?     @default(1) // e.g. Day 1, Day 2
  notes                 String?
  split_mode            String   @default("equal_headcount") // equal_headcount | equal_family | custom_percentage | exact_amounts
  is_active             Boolean  @default(true)
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  trip                  FairShareTrip            @relation(fields: [trip_id], references: [id], onDelete: Cascade)
  payer                 FairShareParticipant    @relation(fields: [payer_participant_id], references: [id])
  splits                FairShareExpenseSplit[]
}

model FairShareExpenseSplit {
  id                 String   @id @default(uuid())
  expense_id         String
  participant_id     String
  household_id       String?
  allocated_amount   Decimal
  share_percentage   Decimal?
  is_excluded        Boolean  @default(false)
  created_at         DateTime @default(now())

  expense            FairShareExpense        @relation(fields: [expense_id], references: [id], onDelete: Cascade)
  participant        FairShareParticipant    @relation(fields: [participant_id], references: [id], onDelete: Cascade)
  household          FairShareHousehold?      @relation(fields: [household_id], references: [id], onDelete: SetNull)
}

model FairShareSettlement {
  id                 String   @id @default(uuid())
  trip_id            String
  from_entity_id     String   // Participant ID or Household ID
  to_entity_id       String   // Participant ID or Household ID
  from_entity_name   String
  to_entity_name     String
  entity_type        String   @default("family") // family | individual
  amount             Decimal
  payment_method     String   @default("upi")    // upi | cash | bank_transfer
  notes              String?
  settled_at         DateTime @default(now())

  trip               FairShareTrip            @relation(fields: [trip_id], references: [id], onDelete: Cascade)
}
```

---

## 4. Financial Calculation Engine & Greedy Debt Simplification

### 4.1 Balance Calculation

For each entity (Household $H_i$ or Individual $P_i$):
$$\text{Total Paid} = \sum \text{Amount of expenses paid by this entity}$$
$$\text{Total Share} = \sum \text{Allocated split amounts owed by this entity}$$
$$\text{Settlements Paid} = \sum \text{Settlements where entity is } \text{from\_entity}$$
$$\text{Settlements Received} = \sum \text{Settlements where entity is } \text{to\_entity}$$
$$\text{Net Balance} = (\text{Total Paid} + \text{Settlements Paid}) - (\text{Total Share} + \text{Settlements Received})$$

- If $\text{Net Balance} > 0$: The entity is a **Creditor** (gets back money).
- If $\text{Net Balance} < 0$: The entity is a **Debtor** (owes money).
- If $\text{Net Balance} = 0$: The entity is **Settled**.

### 4.2 Greedy Debt Simplification Algorithm

To reduce the number of payments from $O(N^2)$ to at most $N - 1$:
1. Calculate the net balance of every entity.
2. Separate into two lists:
   - **Debtors** with negative balances: sorted in ascending order (greatest debtor first).
   - **Creditors** with positive balances: sorted in descending order (greatest creditor first).
3. While both lists are non-empty:
   - Take the top debtor $D$ who owes amount $|B_D|$ and top creditor $C$ who is owed $B_C$.
   - Settle amount $S = \min(|B_D|, B_C)$.
   - Generate transaction: **$D$ pays $S$ to $C$**.
   - Update remaining balances:
     - $B_D \leftarrow B_D + S$
     - $B_C \leftarrow B_C - S$
   - If $|B_D| < 0.01$, remove $D$ from Debtors.
   - If $B_C < 0.01$, remove $C$ from Creditors.

---

## 5. WhatsApp Formatter Specification

The export string must be compiled into standard WhatsApp markdown:
- Heading: `🌴 *{trip.title} — Expense Summary*`
- Duration & Spend: `📅 *Duration:* {days} Days • 💰 *Total Spend:* {formatINR(totalSpend)}`
- Section 1: `━━━━━━━━━━━━━━━━━━━━\n📊 *DAY-BY-DAY EXPENSES*\n━━━━━━━━━━━━━━━━━━━━`
- Day groups:
  ```text
  *Day 1 (Oct 3)*
  • Breakfast & Coffee: ₹1,200 (Paid by Saminathan)
  • Tempo Traveller Van: ₹15,000 (Paid by Anbu)
  ```
- Section 2: `━━━━━━━━━━━━━━━━━━━━\n💳 *FINAL SETTLEMENT (Who Pays Whom)*\n━━━━━━━━━━━━━━━━━━━━`
  ```text
  ✅ *Household / Family Level:*
  • *Saminathan Family* pays *₹3,200* ➔ *Anbu Family*
  • *Anand Family* pays *₹5,800* ➔ *Anbu Family*
  ```

---

## 6. Multi-Tab Excel Export Specification

Generated as a downloadable workbook (`.xlsx` or `.csv`):
1. **Sheet 1: Settlement & Summary**:
   - Trip Title, Location, Dates, Total Spend, Currency.
   - Household / Participant Net Balances Table (Paid, Share, Net).
   - Simplified Settlement Checklist ("From", "To", "Amount (INR)", "Status").
2. **Sheet 2: Detailed Expense Ledger**:
   - Columns: `Date`, `Day`, `Category`, `Expense Title`, `Paid By`, `Total Amount`, `Split Mode`, `Split Allocation Summary`, `Notes`.

---

## 7. Compliance & Tech Stack Adherence

- Frameworks: React 18, Zustand, Tailwind CSS, Recharts, NestJS, Prisma.
- Monetary Precision: `Decimal.js` for all splits, net balances, and settlement amounts (zero floating-point math).
- Storage Parity: Implemented with `IFairShareRepository`, `PrismaFairShareRepository`, and `LocalStorageFairShareRepository`.
- Database Isolation: Local dev uses local SQLite `dev.db`. Zero direct production connections.

