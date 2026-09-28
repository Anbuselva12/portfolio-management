# Design Spec 02 — Dashboard

**Companion to:** SDD-Family-Wealth-Manager.md §4.6, §8
**Shared tokens/components:** see Design-Spec-00-Foundations.md

---

## Screen: Dashboard (Family view, default) / "My view" toggle
The home screen after login (once `status = active` and a family is set).

**Layout: top KPI strip → two-column chart area → recent activity.**
*(Note: If the logged-in user is an Admin and pending member join requests exist, a prominent amber notification banner appears above the KPI strip with a "Review & Approve →" CTA routing to `/settings/members`).*

### KPI Strip
Stat cards arranged in a responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6`):
1. **Net Worth** (large primary number, with ↑/↓ MoM change vs last month)
2. **Total Assets** (bank, FDs, gold & more)
3. **Total Liabilities / Debt** (active debt sum with active loan count)
4. **Monthly Income / Inflow** (active recurring incomes sum)
5. **Monthly Outflow** (expenses + scheduled EMI sum, with sub-line breakdown: "Exp: ₹X" and "EMI: ₹Y")
6. **Monthly Net Savings** (surplus/deficit with savings rate %)

**Display & Anti-Truncation Rules for 5+ Digit Values**:
- **Whole-Rupee Formatting (`formatKpiINR`)**: Formats high-level KPI cards to whole rupees without redundant trailing paise decimals (`.00`), saving horizontal space.
- **Adaptive Font Scaling**: Font size dynamically scales with digit length (e.g. 5–8 digits vs. 9–14 digits) so multi-lakh and multi-crore numbers are fully displayed on one line without truncation ellipses.
- **Tooltip Precision**: Card values include a native hover tooltip showing the exact full precision amount formatted with paise decimals.
- **Title & Sub-metric Integrity**: Titles and sub-lines preserve full labels without truncation collisions.

### Pending Reminders & Monthly Action Queue (Directly Below KPI Strip)
A dedicated, prominent action widget for the current month tracking incoming revenues and outgoing loan payments:
- **Collapsible Toggle (Default: Collapsed)**:
  - By default, the widget is rendered in a compact, collapsed summary bar showing:
    - Month tag (e.g. "September 2026")
    - Pending action badge (e.g., "5 Actions Pending" or "All Caught Up")
    - Expand / Collapse toggle button with chevron indicator ("Show Reminders" / "Hide").
  - When expanded, reveals the full two-column interactive queues. This preserves screen real estate and lets users immediately see their net worth and cash flow charts without being pushed down.
- **Recurring Income Arrivals**:
  - Lists active recurring incomes scheduled for the month (e.g., Salary, House 1 Rent, House 2 Rent).
  - Displays: Label, expected due day, expected amount.
  - Interactive Action: **"Confirm Received"** button (1-click arrival).
  - Inline Edit: **"Adjust Amount"** field allowing the user to enter the exact amount received that month (e.g. tenant paid ₹10,000 instead of ₹12,000, or salary had overtime/bonus ₹1,65,000) directly from the dashboard. Once confirmed, marks status as Received for this month and logs the monthly variance without overwriting historical recurring rules.
- **Monthly Loan EMI Queue**:
  - Lists active loans with `emi_reminders_enabled: true` due this month.
  - Displays: Loan name, place/purpose, lender, due date, EMI amount.
  - Interactive Action: **"Mark EMI Paid"** button (bi-directionally updates loan repayment schedule and monthly expense status).
- **Badge / Counter**:
  - Highlights count of pending reminders (e.g., "3 items pending action this month").
  - Auto-cleanses/hides items once marked confirmed/paid for the active month.

### Chart Row 1 (side by side; stack on mobile)
- **Net Worth Trend** — line chart, trailing 12 months. Dual-line: Net Worth (solid), Assets (dashed), Liabilities (dashed), togglable.
- **Asset Allocation** — donut chart by asset type, center label = Total Assets figure.

### Chart Row 2
- **Liability Breakdown** — donut/bar by loan type, with a Debt-to-Income Ratio gauge/badge alongside.
- **Income vs Expense vs EMI** — stacked bar, trailing 12 months, income as a line overlay against stacked expense+EMI bars, so surplus/deficit months are visually obvious. Household expenses strictly exclude loan EMIs to prevent double-counting against scheduled loan repayments. Monthly income includes all active recurring incomes, one-off inflows, and other income sources for each month.

### Chart Row 3 (full width)
- **Debt Payoff Timeline** — Gantt-style horizontal timeline, one row per active loan, bar length = months to payoff under the currently selected strategy (dropdown: Minimum Payments / Avalanche / Snowball / Custom-Weighted / AI Suggestion), with a toggle to overlay 2 strategies at once for direct comparison.

### Below Charts
- "Repayment Suggestions" summary card with "Compare all strategies →" CTA (→ Debt Strategy Comparison screen).
- Compact **Recent Activity** feed (last 5 entries: "Anbu added FD ₹2,00,000", "Priya logged Electricity ₹1,450").

### Member Filter Toggle
Top-right: "Whole Family" (default) vs "Just Me" — switches all KPIs/charts on this screen to the logged-in member's own data only.

## States
- **Empty state** (new family, no data yet): each chart area shows a lightweight illustration + CTA ("Add your first asset", "Add your first loan") instead of an empty chart.
- **Loading**: skeleton cards/charts while aggregation queries run (see Foundations §5).
- **Pending-approval members**: never reach this screen (see Design-Spec-01 §4).
