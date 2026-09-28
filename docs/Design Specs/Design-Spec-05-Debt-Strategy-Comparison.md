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
    - **Top Interest-Saving Strategy**: Identifies the strategy producing the maximum total interest saved (e.g. "Debt Avalanche saves ₹4,68,890.78, cutting payoff by X months").
    - **Fastest Debt Elimination / Milestone**: Identifies which loan(s) can be completely wiped out today with the current surplus amount (e.g. "Instant Milestone: Fully eliminate Insurance Premium (₹69,881) today to eliminate 1 monthly EMI obligation").
    - **Cascading Surplus Summary**: Highlights how the full surplus (e.g. ₹5,00,000) is deployed across multiple loans when earlier loans are paid off.
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
- Four or five `StrategyCard`s in a horizontal comparison layout (stack on mobile), each showing:
  - Strategy name + one-line description (e.g., "Avalanche — pays the highest-interest loan first")
  - Target loan highlight with badge, interest rate, outstanding balance, and specific loan name / place
  - Allocation table: Loan → Extra Amount (shows exact multi-loan partition when surplus overflows)
  - Key metrics: Months to Debt-Free (all loans), Total Interest Saved vs. minimum-only baseline
  - **Custom-Weighted Strategy Card**:
    - In cascade mode: cascades to highest composite scored loan.
    - In split mode / optimal split: suggests optimal percentage distribution (e.g. 50% / 30% / 20%) across loans to balance interest savings and psychological milestones.
  - **AI Suggestion card (when enabled)**: short rationale paragraph (from Gemini) tailored to the chosen mode (one-off vs recurring) + a clearly labeled disclaimer chip: "AI-generated — for guidance only."
- **Multi-Loan Type Support (Home, Personal, Vehicle, Gold / Jewel Loans)**:
  - The strategy engine supports all retail loan categories simultaneously:
    - Standard amortising loans (Home, Vehicle, Personal) have fixed monthly contractual EMIs.
    - **Gold / Jewel Loans** (`jewel` / `gold`): baseline monthly obligation is defined as the monthly accrued interest ($P \times \frac{R}{12 \times 100}$) to halt monthly balance capitalisation. When surplus is allocated to a Gold Loan (e.g. under Avalanche for high-interest gold debt), principal is paid down directly, eliminating future compounding and shrinking the final bullet obligation at maturity.
- **"Compare on Timeline"** toggle: select any two strategy cards to overlay on the Debt Payoff Timeline chart (reuses the Dashboard's `GanttTimeline` component) — this is how the "close all in one-go vs take-one-loan-first" comparison is made visual.
- **"Mark as My Plan"** button on a card stores the choice (SuggestionSnapshot) for the user's own tracking; it does **not** auto-apply any prepayment — the user still goes to the specific Loan's Prepayment Calculator (Design-Spec-04) to actually execute it. This reinforces the reversible-confidence principle: recommendations and commitments are always separate steps.

## Custom-Weighted Strategy — Settings Link
- A small "Adjust weights" link on the Custom-Weighted card opens Family Settings → Strategy Weights (sliders for rate/balance/flexibility/penalty/tenure weighting, plus a split-vs-cascade mode toggle and optimal distribution preset) — see Design-Spec-07.

## States
- No active loans: screen shows an empty state instead of strategy cards — "Add a loan to see repayment strategies."
- Surplus is zero or negative: all strategy cards still render but show "No extra surplus available" with allocations at ₹0, so the user still sees the baseline Minimum-Payments timeline.

