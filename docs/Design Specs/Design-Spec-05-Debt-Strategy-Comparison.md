# Design Spec 05 — Debt Repayment Strategy Comparison

**Companion to:** SDD-Family-Wealth-Manager.md §4.4, §7.7
**Shared tokens/components:** see Design-Spec-00-Foundations.md

---

## Screen: Strategy Comparison (family-level, cross-loan)
- Top: 
  - **Surplus Input & Mode Toggle**:
    - Mode Switcher: **"One-Off Lump Sum"** (e.g. bonus, savings, windfalls to deploy once) vs. **"Recurring Monthly"** (ongoing monthly extra cashflow).
    - Amount field: "Surplus Amount: ₹[auto-computed or user-entered]" with quick presets (e.g. ₹50k, ₹1L, ₹2L, ₹5L) and editable override field.
    - **AI Advisor On-Demand Toggle**: "Include Gemini AI Advisor" toggle / "Ask AI" button. When turned off, strategies load instantaneously without invoking Gemini. When turned on, invokes Gemini and renders the AI card.
- **Executive Strategy Recommendation Banner (Directly Above Cards)**:
  - High-impact summary bar highlighting:
    - **Top Interest-Saving Strategy**: Identifies the strategy producing the maximum total interest saved (e.g. "Debt Avalanche saves ₹4,68,890.78, cutting payoff by X months", or "Custom-Weighted Strategy delivers maximum interest savings (₹2,62,495)").
    - **Fastest Debt Elimination / Milestone**: Identifies which loan(s) can be completely wiped out today with the current surplus amount (e.g. "Instant Milestone: Fully eliminate Insurance Premium (₹69,881) today to eliminate 1 monthly EMI obligation").
    - **Cascading Surplus Summary**: Highlights how the full surplus (e.g. ₹5,00,000) is deployed across multiple loans when earlier loans are paid off.
    - **Synchronized Recommendation Verdict**: The text verdict dynamically names whichever strategy achieves the highest interest savings (Avalanche, Custom-Weighted, Snowball, or AI Smart Plan), ensuring total consistency between the verdict message, leader chip, and max saved metric.
- When **One-Off Lump Sum** mode is selected:
  - Extra money is applied as a single lump-sum prepayment in Month 1 across the target loan(s).
  - **Multi-Loan Cascading Overflow Guarantee**: If the lump sum exceeds the target loan's balance, the excess cascades to the next ranked loan(s) until 100% of the lump sum is deployed.
  - From Month 2 onwards, all remaining loans continue on their baseline minimum EMIs.
  - Metrics clearly communicate:
    - **One-Off Deployment Allocation**: exactly which loan(s) receive the lump sum today, and which loans reach ₹0 (Paid Off).
    - **Total Lifetime Interest Saved**: interest avoided over the loan lifetimes strictly from this single injection.
    - **Tenure Reduction**: total months knocked off across loans.
  - Strategy cards provide direct "Execute Prepayment →" links directly navigating to `/loans/:id` with prepopulated values.
- When **Recurring Monthly** mode is selected:
  - Extra money is assumed available every month until all loans reach zero.
  - Applies rolling waterfall cascade when an earlier loan is paid off.
- Active acceleration strategy cards in a comparison layout (Debt Avalanche, Debt Snowball, Custom-Weighted, and AI Suggestion when toggled on):
  - **Removal of Minimum Payments (Baseline) Card**: The baseline minimum-payment card is omitted from the strategy cards grid as standard minimum EMIs provide no payoff acceleration. Baseline metrics remain available internally for benchmark comparison.
  - Strategy name + one-line description (e.g., "Avalanche — pays the highest-interest loan first")
  - Target loan highlight with badge, interest rate, outstanding balance, and specific loan name / place
  - Allocation table: Loan → Extra Amount (shows exact multi-loan partition when surplus overflows)
  - Key metrics: Months to Debt-Free (all loans), Total Interest Saved vs. minimum-only baseline
  - **Custom-Weighted Strategy Card (Redesigned with Interactive Sliders)**:
    - **All Active Loans with Percentage Sliders**: Each active loan displays an interactive percentage slider (0% to 100%).
    - **Default Allocation**: By default, 100% is allocated to the highest outstanding principal loan, and 0% to all remaining loans.
    - **Automatic 100% Balancing**: Adjusting any loan slider automatically adjusts the highest loan (or other loans) so that the sum of all percentages strictly equals 100% at all times (e.g., setting a second loan to 10% automatically lowers the highest loan from 100% to 90%).
    - **Per-Loan & Overall Interest Savings**: Dynamically displays each loan's allocated extra amount (e.g. ₹5,000 for 10% of ₹50,000 surplus), each loan's individual lifetime interest savings (e.g. "Saves ₹8,200"), and the combined household total interest saved and accelerated debt-free horizon.
    - **Clean Typography (Anti-Overlap)**: Total Interest Saved metric uses single-line responsive font scaling (`text-lg sm:text-xl whitespace-nowrap`) ensuring the `+` prefix and currency amount never wrap to multiple lines or overlap the baseline comparison label.
    - **No Scoring Weights Link**: The legacy "Adjust scoring weights & mode" modal link is omitted; allocations are configured directly and transparently via the inline percentage sliders.
    - **Configuration Persistence**: A "Save Config" button saves the custom percentage allocation to family settings (`strategy_weights.loanPercentages`). This configuration persists on future visits until the selected loans are closed or the user chooses to reconfigure.
    - **Reset to Default**: A "Reset Default" button returns allocation to 100% on the highest principal loan.
  - **AI Suggestion card (when enabled)**: short rationale paragraph (from Gemini) tailored to the chosen mode (one-off vs recurring) + a clearly labeled disclaimer chip: "AI-generated — for guidance only."
- **Multi-Loan Type Support (Home, Personal, Vehicle, Gold / Jewel Loans)**:
  - The strategy engine supports all retail loan categories simultaneously:
    - Standard amortising loans (Home, Vehicle, Personal) have fixed monthly contractual EMIs.
    - **Gold / Jewel Loans** (`jewel` / `gold`): operates with **₹0.00 mandatory monthly payment**. In the baseline simulation, interest capitalizes monthly into the principal, leading to the full compounding bullet balance at maturity (Scenario A: Pay nothing till maturity). When surplus is allocated to a Gold Loan (e.g. under Avalanche for high-interest debt), extra funds pay down the accumulated gold principal directly, eliminating future compounding and accelerating early debt-free closure before maturity.
- **Loan Portfolio Breakdown by Debt Type (Replacing Timeline Comparison)**:
  - The legacy Dual-Strategy Payoff Timeline Comparison section is replaced with a comprehensive **Loan Portfolio Breakdown by Debt Type** visualization.
  - Groups all household debts by loan type (e.g., Personal Loan, Home Loan, Gold / Jewel Loan, Vehicle Loan, Education Loan).
  - Displays:
    - Visual Donut / Bar chart showing categorical distribution of total debt.
    - Metric cards per category showing aggregate outstanding balance, share of total debt, active loan count, and average APR.
    - Accessible "View as Table" toggle providing full tabular data.
- **"Mark as My Plan"** button on a card stores the choice (SuggestionSnapshot) for the user's own tracking; it does **not** auto-apply any prepayment — the user still goes to the specific Loan's Prepayment Calculator (Design-Spec-04) to actually execute it. This reinforces the reversible-confidence principle: recommendations and commitments are always separate steps.

## Custom-Weighted Strategy — Slider Allocation & Persistence
- Percentage sliders per loan allow custom split modeling (e.g., 90% to highest debt, 10% to quick-win debt).
- Persistence stored in Family Settings (`strategy_weights`) ensures user preferences remain active across sessions until debts are fully extinguished.

## States
- No active loans: screen shows an empty state instead of strategy cards — "Add a loan to see repayment strategies."
- Surplus is zero or negative: all strategy cards still render but show "No extra surplus available" with allocations at ₹0, so the user still sees the baseline Minimum-Payments timeline.

