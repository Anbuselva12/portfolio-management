# Story 3 — Debt Strategy Engine, AI Suggestions, Audit & Launch Polish

**Companion documents:** SDD-Family-Wealth-Manager.md (§4.4, §4.7, §7.7, §9, §12–13), Design-Spec-05-Debt-Strategy-Comparison.md, Design-Spec-07-Admin-Audit-Settings.md

**Depends on:** Story 1 (Family/Member foundation) and Story 2 (Loan engine, Debt Payoff Timeline chart)

**Goal:** The "which loan to pay first" intelligence layer, full audit trail, and the cross-cutting polish needed to actually deploy.

---

## Scope

### Debt Repayment Strategy Engine
- Available Surplus auto-computed (Income − Expenses − Fixed EMIs), user-overridable per run
- **Prepayment Mode Switcher**:
  - **One-Off Lump Sum**: Simulates a single windfall deployed in Month 1 across target loans, with baseline EMIs continuing Month 2 onwards. Computes lifetime interest saved and tenure reduction.
  - **Recurring Monthly**: Ongoing surplus injected every month with cascading payoff.
- **Avalanche**: highest-interest-rate loan first, with multi-loan cascading overflow ensuring 100% of surplus is allocated
- **Snowball**: smallest-outstanding-balance loan first, with multi-loan cascading overflow ensuring 100% of surplus is allocated
- **Custom-Weighted**: interactive percentage sliders per active loan (0% to 100%), auto-balancing to 100% (default 100% to highest principal loan, 0% to rest), computing individual per-loan lifetime interest savings and overall savings, with persistent configuration saving until loans are closed
- **Multi-Loan Cascading Overflow Guarantee**: When surplus exceeds a loan's balance, excess funds cascade to next ranked loans so the full surplus is deployed and interest saved is fully calculated
- Simulation core: month-by-month simulator shared by all strategies, producing months-to-debt-free and total-interest-saved-vs-baseline for each mode (baseline card omitted from grid display, reserved for internal benchmark comparison)

### AI Suggestion Strategy (Gemini - On-Demand)
- Explicit user control: requested only when the user chooses "Include Gemini AI Advisor" (or clicks "Ask AI")
- Server-side proxy call to Google Gemini API using `GEMINI_API_KEY` from `.env` (never exposed to frontend)
- Anonymized loan/income/expense snapshot sent (no PII — lender names/strings excluded)
- Mode-aware prompt: instructs Gemini whether recommendation is for a one-off lump-sum allocation or recurring surplus
- Structured JSON response schema: `{allocations: [{loan_id, extra_amount}], rationale: string}`
- Graceful degradation: if the Gemini call fails/times out, the AI card is simply omitted rather than shown as an error

### Strategy Comparison Screen
- **Executive Strategy Recommendation Banner**: Instant summary showing top interest-saving strategy, fastest debt elimination loan, and actionable verdict
- Mode switcher ("One-Off Lump Sum" vs "Recurring Monthly") and surplus amount input with presets
- AI Advisor On-Demand toggle
- Strategy cards side by side: target loan highlights, multi-loan allocation table, months-to-debt-free, total interest saved, rationale (AI card only), direct link to execute prepayment on target loan
- "Compare on Timeline" — overlay any two strategies on the Debt Payoff Timeline chart (extends Story 2's single-strategy chart to multi-strategy overlay)
- "Mark as My Plan" — stores the chosen SuggestionSnapshot for tracking only; does not auto-apply any prepayment (user still uses Story 2's Prepayment Calculator to execute)

### Dashboard Pending Reminders & Monthly Action Queue
- Pending Reminders widget on Dashboard tracking the current calendar month:
  - **Recurring Incomes**: lists active recurring incomes with `reminders_enabled: true`. Provides 1-click "Confirm Received" or inline amount adjustment (e.g. for variable salary or partial rent) without altering the recurring baseline contract.
  - **Loan EMIs**: lists active loans due this month with `emi_reminders_enabled: true`. 1-click "Mark EMI Paid" with bi-directional synchronization to loan schedule and expense ledger.

### Audit Trail
- Full change log across all entities from Stories 1–2: create/update/delete/restore/login/password_reset/approve/reject, with before/after field diffs
- Filters: Member, Entity Type, Date Range, Action
- Admin restore action for soft-deleted records (Assets, Income, Loans, Expenses, Insurance — soft-delete flags already exist from Story 1/2, this story adds the viewing/restore UI)
- Member-scoped "My Activity" view for non-Admins

### Multi-Currency Polish
- CurrencyRate table + management UI in Family Settings (manual entry/edit)
- Per-entity `locked_rate` option for point-in-time accuracy on big-ticket items
- Conversion applied consistently across all Dashboard KPIs/charts to the family's base currency

### Accessibility & Quality Pass
- "View as table" toggle on every chart (Dashboard, Debt Payoff Timeline)
- Contrast and keyboard-navigation verification across all screens (light + dark mode)
- Storage-mode parity test suite extended to cover Strategy Engine, AI Suggestion (mocked), and Audit entities

### Deployment
- Containerize backend (Docker)
- Document all `.env` variables (DB config, `GEMINI_API_KEY`, `JWT_SECRET`, `DEFAULT_CURRENCY`, `DEFAULT_COUNTRY`)
- Frontend static build pipeline for deployment (server mode) and standalone build for local-only mode

---

## Explicitly Out of Scope for This Story
- Countries beyond India, invite-code/link-based family joining, bank/CSV statement import, budget alerts, notifications/reminders outside in-app dashboard queue, goal-based savings, mobile apps — all remain Future Scope per SDD §14, not part of this build.

---

## Definition of Done
1. For a family with 3+ active loans and a positive surplus, all strategies render correct, comparable allocations and payoff projections in both **One-Off Lump Sum** and **Recurring Monthly** modes; disabling/breaking the Gemini call degrades gracefully without breaking the other cards.
2. Direct prepayment links navigate from strategy cards to the target loan with amounts pre-filled.
3. The Dashboard displays a Pending Reminders section allowing 1-click confirmation or inline amount modification for recurring incomes, recording monthly actual receipts without corrupting base recurring contracts.
4. The Debt Payoff Timeline chart correctly overlays two selected strategies for direct visual comparison.
5. "Mark as My Plan" persists a SuggestionSnapshot without mutating any loan or schedule data.
6. Every mutating action across the entire app (from Stories 1–3) appears correctly in the Audit Trail with accurate before/after diffs, filterable by member/entity/date/action.
7. A soft-deleted Asset (or any other soft-deletable entity) can be restored by an Admin from the Audit Trail and reappears correctly in the Dashboard.
8. Currency conversion is verified correct across at least two currencies feeding into one family's consolidated Dashboard.
9. The full application runs correctly end-to-end in both local (LocalStorage) and deployed (real DB via `.env`) modes, with the same test suite passing in both.
