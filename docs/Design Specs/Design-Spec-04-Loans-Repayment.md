# Design Spec 04 — Loans, Repayment Schedule & Prepayment Calculator

**Companion to:** SDD-Family-Wealth-Manager.md §4.3, §7.1–§7.9  
**Shared tokens/components:** see Design-Spec-00-Foundations.md

---

## 1. Screen: Loan List
- Cards grouped by Member. Each card:
  - **Header**: Loan Type icon, **Loan Name** (bold, e.g. "Home Loan Top Up"), **Place / Purpose** tag (e.g. "Chennai Home"), Lender (e.g. "HDFC Bank"), EMI badge (Fixed/Flexible), and **EMI Reminder Indicator** (Active / Off).
  - **Metrics Grid**: Outstanding Principal (large font, formatted currency), Interest Rate (`X.XX% p.a.`), Monthly EMI (`₹XX,XXX/mo`), and Remaining Tenure (`XX months`).
  - Progress bar (paid installments vs remaining tenure). Click → Loan Detail.
- **Top Summary Metrics**: Total active debt sum and Total monthly EMI obligation sum (correctly formatted with camelCase/snake_case safety fallbacks).

## 2. Screen: Loan Detail
- **Header**:
  - **Loan Name** (h1, prominent), Loan Type badge, Status badge.
  - Sub-details: Lender, **Place / Property / Purpose**, Origin Date, and Projected Payoff Date.
  - **EMI Reminder Toggle Switch**: "Auto-Add Monthly EMI to Expenses" (allows enabling/disabling automatic monthly expense queuing at any time).
  - **Personal Notes Card**: Displays user comments and notes for themselves, editable inline.
- **Discrepancy banner** (`DiscrepancyBanner`, amber): shown when a reconciliation occurred (SDD §7.3) — "Your entered EMI (₹X) differs from the calculated EMI (₹Y) by Z%. We've adjusted the schedule to match your real-world EMI. [Details]"
- **Primary Action Buttons**:
  - **"Sync Statement"** (Ghost/Secondary with Refresh icon) → Launches Statement Calibration Modal (§5).
  - **"Make Part-Payment"** (Emerald with Cash icon) → Launches Part-Payment Modal with Broken-Period Interest (§3).
  - **"Log Rate Revision"** (Indigo with Trending icon) → Launches Rate Revision Modal (§4).
  - **"Run Prepayment Calculator"** (Secondary) → Launches Simulation Calculator.
  - **"View in Strategy Comparison"** (Secondary) → Navigates to Debt Strategy Comparison (Design-Spec-05).
- **Repayment Schedule table** (core requirement):
  - Columns: #, Due Date, Opening Balance, EMI, Principal, Interest, Closing Balance, Status (`Paid` / `Unpaid`), and Action.
  - **1-Click Mark as Paid Action**: Users can directly click "Mark as Paid" on any active installment. This immediately marks the installment paid, records the payment date, recalculates outstanding principal, and synchronizes with the Monthly Expense Queue.
  - Inline row correction (click edit → adjust actual amount paid). Virtualized scroll + jump-to-month control.
- **History Cards**:
  - **Rate Revision History**: chronological ledger of repo/EBLR resets (Effective Date, Rate change `8.65% → 8.40%`, Mode, Tenure Impact, Interest Saved).
  - **Part-Payment Ledger**: record of extra payments (Date, Principal Prepaid, Accrued Broken-Period Interest, Total Paid, Mode Chosen, Net Benefit).

---

## 3. Part-Payment Modal (with Broken-Period Simple Interest)
Direct execution modal for recording ad-hoc principal prepayments against active loans.
- **Inputs**:
  - **Prepayment Amount (₹)**: Principal reduction amount.
  - **Payment Date**: Execution date.
  - **Mode Toggle**:
    - `Reduce Tenure` (Keep current EMI, shrink remaining months).
    - `Reduce EMI` (Keep remaining months, recalculate lower EMI).
  - **Accrued / Broken-Period Interest (₹)**: Simple interest charged by lender (e.g., ₹120 charged by HDFC) for days elapsed from the last EMI due date to payment execution date.
    - Formula: $\text{Accrued Interest} = (P \times R \times \text{Days}) / (365 \times 100)$.
  - **Prepayment Charges / Penalty (₹)**: Pre-calculated based on loan terms, user-editable.
  - **Notes**: Reason or bank transaction reference.
- **Live Outflow & Impact Preview**:
  - **Cash Outflow Breakdown**: $\text{Principal} + \text{Penalty} + \text{Accrued Simple Interest} = \mathbf{Total\ Outflow}$.
  - **Tenure Impact**: "Payoff shortened by X months (new payoff date: MM/YYYY)".
  - **Financial Savings**: Gross Interest Saved, Penalty/Accrued deduction, and Net Lifetime Benefit.
- **Action**: "Apply Part-Payment" (commits to `PrepaymentRecord`, regenerates downstream schedule, logs audit entry).

---

## 4. Rate Revision Modal (Floating-Rate / RLLR / EBLR)
Supports periodic benchmark rate adjustments (e.g. RBI repo-rate changes).
- **Inputs**:
  - **New Annual Interest Rate (%)**: Enter updated interest rate.
  - **Effective Date**: Date the reset applies from.
  - **Revision Mode**:
    - **Keep EMI Constant (Standard Indian Home Loan)**: EMI remains unchanged; tenure automatically contracts (rate cuts) or expands (rate hikes) via logarithmic amortization.
    - **Keep Tenure Constant**: Remaining months stay unchanged; monthly EMI is recalculated.
  - **Notes / Reason**: e.g., "RBI Repo rate cut 25 bps / Bank EBLR reset".
- **Live Preview**:
  - Rate Change: `Old Rate%` $\to$ `New Rate%`.
  - Remaining Tenure: `Old Months` $\to$ `New Months` (with $\pm$ Months difference).
  - Projected Lifetime Interest Savings.
- **Action**: "Apply Rate Revision" (updates loan terms, creates `RateRevisionRecord`, regenerates future schedule from effective date, logs audit entry).

---

## 5. Statement Calibration Modal (Sync to Real-World Bank Statement)
Allows one-click alignment of an existing active loan with live bank statements without reconstructing historical payments.
- **Inputs**:
  - **Current Outstanding Principal (₹)**: Exact balance from bank statement.
  - **Remaining Tenure (Months)**: Remaining scheduled installments from bank.
  - **Current Annual Interest Rate (%)**: Active floating rate.
  - **Authoritative Monthly EMI (₹)**: Current monthly debit.
- **Engine Processing**:
  - Updates loan `current_outstanding_principal`, `remaining_tenure_months`, and `interest_rate_annual`.
  - Replaces all future unpaid installments with an exact schedule derived from statement values.
  - Absorbs any residual balance on the final month so balance amortizes to exactly ₹0.00.
  - Logs calibration audit entry.

---

## 6. States
- **Empty state** (no loans yet): "No loans tracked yet — add your first loan to see its repayment schedule and payoff calculator."
- **Loan nearing payoff** (< 3 installments left): small "Almost there 🎉" badge on the card, purely informational.
- **Loan in `defaulted` status**: red badge, schedule still viewable/editable but Prepayment/Rate Revision disabled with explanatory tooltip.
