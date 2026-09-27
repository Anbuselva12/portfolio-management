# Design Spec 05 — Debt Repayment Strategy Comparison

**Companion to:** SDD-Family-Wealth-Manager.md §4.4, §7.7
**Shared tokens/components:** see Design-Spec-00-Foundations.md

---

## Screen: Strategy Comparison (family-level, cross-loan)
- Top: 
  - **Surplus Input & Mode Toggle**:
    - Mode Switcher: **"One-Off Lump Sum"** (e.g. bonus, savings, windfalls to deploy once) vs. **"Recurring Monthly"** (ongoing monthly extra cashflow).
    - Amount field: "Surplus Amount: ₹[auto-computed or user-entered]" with quick presets (e.g. ₹50k, ₹1L, ₹2L) and editable override field.
- When **One-Off Lump Sum** mode is selected:
  - Extra money is applied as a single lump-sum prepayment in Month 1 across the target loan(s).
  - From Month 2 onwards, all remaining loans continue on their baseline minimum EMIs.
  - Metrics clearly communicate:
    - **One-Off Deployment Allocation**: exactly which loan(s) receive the lump sum today.
    - **Total Lifetime Interest Saved**: interest avoided over the loan lifetimes strictly from this single injection.
    - **Tenure Reduction**: total months knocked off across loans.
  - Strategy cards provide direct "Execute Prepayment →" links directly navigating to `/loans/:id` with prepopulated values.
- When **Recurring Monthly** mode is selected:
  - Extra money is assumed available every month until all loans reach zero.
  - Applies rolling waterfall cascade when an earlier loan is paid off.
- Four or five `StrategyCard`s in a horizontal comparison layout (stack on mobile), each showing:
  - Strategy name + one-line description (e.g., "Avalanche — pays the highest-interest loan first")
  - Target loan highlight with badge, interest rate, outstanding balance, and specific loan name / place
  - Allocation table: Loan → Extra Amount
  - Key metrics: Months to Debt-Free (all loans), Total Interest Saved vs. minimum-only baseline
  - **AI Suggestion card**: short rationale paragraph (from Gemini) tailored to the chosen mode (one-off vs recurring) + a clearly labeled disclaimer chip: "AI-generated — for guidance only." If the Gemini call fails/times out, this card is simply omitted (graceful degradation) rather than shown as an error.
- **"Compare on Timeline"** toggle: select any two strategy cards to overlay on the Debt Payoff Timeline chart (reuses the Dashboard's `GanttTimeline` component) — this is how the "close all in one-go vs take-one-loan-first" comparison is made visual.
- **"Mark as My Plan"** button on a card stores the choice (SuggestionSnapshot) for the user's own tracking; it does **not** auto-apply any prepayment — the user still goes to the specific Loan's Prepayment Calculator (Design-Spec-04) to actually execute it. This reinforces the reversible-confidence principle: recommendations and commitments are always separate steps.

## Custom-Weighted Strategy — Settings Link
- A small "Adjust weights" link on the Custom-Weighted card opens Family Settings → Strategy Weights (sliders for rate/balance/flexibility/penalty/tenure weighting, plus a split-vs-cascade mode toggle) — see Design-Spec-07.

## States
- No active loans: screen shows an empty state instead of strategy cards — "Add a loan to see repayment strategies."
- Surplus is zero or negative: all strategy cards still render but show "No extra surplus available" with allocations at ₹0, so the user still sees the baseline Minimum-Payments timeline.

