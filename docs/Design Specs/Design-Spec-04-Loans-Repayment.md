# Design Spec 04 — Loans, Repayment Schedule & Prepayment Calculator

**Companion to:** SDD-Family-Wealth-Manager.md §4.3, §7.1–§7.9  
**Shared tokens/components:** see Design-Spec-00-Foundations.md

---

## 1. Screen: Loan List
- Cards grouped by Member. Each card:
  - **Header**: Loan Type icon, **Loan Name** (bold, e.g. "Home Loan Top Up"), **Place / Purpose** tag (e.g. "Chennai Home"), Lender (e.g. "HDFC Bank"), EMI badge (Fixed/Flexible), and **EMI Reminder Indicator** (Active / Off).
  - **Metrics Grid**: Outstanding Principal (large font, formatted currency), Interest Rate (`X.XX% p.a.`), Monthly EMI (`₹XX,XXX/mo`), and Remaining Tenure (`XX months`).
  - Progress bar (paid installments vs remaining tenure). Click → Loan Detail.
- **Top Summary Metrics**: Total active debt sum, Total monthly EMI obligation sum, and **Total Lifetime Interest** across loans (correctly formatted with camelCase/snake_case safety fallbacks).
 
## 2. Screen: Loan Detail
- **Header & Top Summary**:
  - **Loan Name** (h1, prominent), Loan Type badge, Status badge.
  - Sub-details: Lender, **Place / Property / Purpose**, Origin Date, and Projected Payoff Date.
  - **Top Summary Stat Cards**:
    - **Outstanding Principal**: Current balance remaining to be paid.
    - **Total Interest Payable**: Overall accumulated interest scheduled across the loan's lifetime.
    - **Monthly EMI / Minimum Obligation**: Active monthly payment.
    - **Interest Rate**: Current annual rate (e.g. 8.50% p.a.).
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
  - **Table Footer Summary Row (Accumulated Totals)**:
    - Rendered directly below the grid on the respective columns:
      - Under **EMI**: Total Scheduled Outflow ($\sum \text{EMI}$).
      - Under **PRINCIPAL**: Total Accumulated Principal ($\sum \text{Principal}$).
      - Under **INTEREST**: Total Accumulated Interest ($\sum \text{Interest}$).
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

---

## 7. Gold / Jewel Loan Running-Balance Ledger & Dedicated Summary Page
When `loan_type` is **Gold / Jewel Loan** (`jewel` / `gold`), the loan operates purely as a running-balance account with bullet maturity payoff, completely replacing the fixed installment / monthly EMI interface.

### 7.1 Key Calculation Rules (Single Shared Engine)
1. **Daily Accrual Formula**:
   $$\text{Daily Interest} = \text{Balance} \times \frac{\text{Annual Rate}}{100} \times \frac{1}{365}$$
2. **Monthly Capitalization**:
   - Accrued interest is posted on the **last calendar day of each month** (`INTEREST_POSTED`) and added to the balance (monthly compounding).
3. **First Month Truncation**:
   - First partial period counts the disbursal day itself (e.g. 28 Sep to 30 Sep = 3 days). First month's interest is truncated (floor) to the rupee, matching bank convention. Round all other months to the nearest rupee.
4. **Maturity Period**:
   - The final period ends the day **before** maturity, ensuring a standard 12-month loan is exactly 365 calendar days.
5. **No Fixed EMI / No Installments**:
   - Remove Monthly EMI card, auto EMI queue, due dates on arbitrary days, and paid/unpaid installment status.

### 7.2 UI Layout & Sections (Unified Shared Calculation)
1. **Header & Context Strip**:
   - Title: `Gold Loan Summary`
   - Subtitle: `[Disbursal Date] to [Maturity Date] | [Rate]% p.a. | Bullet payoff, no EMI`
   - Interactive `As of date` selector (defaults to today).
   - Parameter strip: Loan amount, Rate % p.a., Disbursal date, Maturity date.
2. **Top 4 Stat Cards**:
   - **Payoff as of Date**: Posted balance + current unposted accrued daily interest.
   - **Interest Charged So Far**: Sum of posted interest + unposted accrued to date.
   - **Paid by You So Far**: Sum of all manual ad-hoc payments (`Manual payments only`).
   - **Days to Maturity**: Remaining days to maturity date.
3. **Smart Tip Banner**:
   - `"Tip: pay at least this month's interest (about ₹X) before [Month End] to stop the balance from growing."`
4. **"What You Will Pay by Maturity" (3 Core Scenarios)**:
   - **Scenario A (Pay Nothing Till Maturity)**: Full compounding balance due in one go at maturity ($\text{Principal} + \text{Total Compounded Interest}$).
   - **Scenario B (Your Payments)**: Total paid along the way + final amount due at maturity, with green badge indicating **Interest Saved vs Scenario A: ₹X**.
   - **Scenario C (Pay Each Month's Interest)**: Total simple interest servicing cost, with badge indicating **Saved vs Scenario A: ₹Y** (balance never compounds).
5. **Outstanding Balance Over Time Chart**:
   - Visual trend line comparing two series from disbursal to maturity:
     - **Red line**: `No payments` (compounding accumulation).
     - **Green line**: `Your payments` (actual trajectory taking effect from each payment date).
6. **"Your Payments" Management & Real-Time Simulation**:
   - Inline payment logger: Date picker, Amount input, Note.
   - Live pre-submission saving preview: `"Paying ₹X on this date saves ₹Y interest by maturity"`.
   - Payment history list: displays logged payment date, amount, note, and green tag `saves ₹Z` with edit and remove actions.
7. **Month-by-Month Compounding Ledger Table**:
   - Columns: `MONTH END`, `DAYS`, `OPENING`, `PAYMENT`, `INTEREST`, `CLOSING (YOURS)`, `CLOSING (NO PAY)`.
   - Footer totals: Total Days (365), Total Payments, Total Interest, Final Due (Yours), Final Due (No Pay).
   - Explanatory footnote detailing daily calculation, truncation, and segmentation rules.
8. **Passbook Statement & Compounding Cost**:
   - Passbook transaction view detailing all disbursals, payments, and interest postings.
   - Compounding cost analysis comparing total interest charged against simple interest ($\text{Principal} \times R \times T$).

---

## 8. States
- **Empty state** (no loans yet): "No loans tracked yet — add your first loan to see its repayment schedule and payoff calculator."
- **Loan nearing payoff** (< 3 installments left): small "Almost there 🎉" badge on the card, purely informational.
- **Loan in `defaulted` status**: red badge, schedule still viewable/editable but Prepayment/Rate Revision disabled with explanatory tooltip.
