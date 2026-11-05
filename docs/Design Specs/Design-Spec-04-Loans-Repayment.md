# Design Spec 04 — Loans, Repayment Schedule & Prepayment Calculator

**Companion to:** SDD-Family-Wealth-Manager.md §4.3, §7.1–§7.9  
**Shared tokens/components:** see Design-Spec-00-Foundations.md

---

## 1. Screen: Loan List
- **Header & Controls**:
  - Top Summary Metrics: Total active debt sum, Total monthly EMI obligation sum (excluding Gold/Jewel loans with bullet repayment), and Total Lifetime Interest across loans.
  - **Tabs Filter (Active Loans / Closed Loans)**:
    - **Active Loans Tab**: Displays all currently active, non-closed, non-deleted loans. Computes active debt and monthly EMI totals.
    - **Closed Loans Tab**: Displays fully closed, completed, and paid-off loans (`closed` or `paid_off` status). Excludes loans marked as soft-deleted. Shows closure reason, closure notes, and settled date badges.
  - **Sorting Controls**: Dropdown selector providing sorting by:
    - **Highest Loan**: Descending by loan principal amount.
    - **Lowest Loan**: Ascending by loan principal amount.
    - **Recently Created**: Newest first by creation or start date.
    - **Oldest**: Oldest first by creation or start date.
- **Card Differentiation by Loan Type**:
  - **Standard Amortizing Loans (Home, Car, Personal, Education, Business, Other)**:
    - **Header**: Loan Type icon, Loan Name, Place/Purpose tag, Lender, EMI badge (`FIXED` / `FLEXIBLE`).
    - **Metrics Grid**: Outstanding Principal, Interest Rate (`X.XX% p.a.`), Monthly EMI (`₹XX,XXX/mo`), Tenure (Total) (`XX months`), and **Remaining Tenure** (`YY months left` or `Matures this month`).
    - **Footer Link**: `View Schedule & Calculator →`.
  - **Gold / Jewel Loans (`jewel` / `gold`)**:
    - **Repayment Characteristic**: Bullet payoff with no mandatory monthly installment.
    - **Header**: Gold icon, Loan Name, Place/Purpose, Lender, Bullet badge (`BULLET (NO EMI)` in amber/gold styling).
    - **Metrics Grid**: Outstanding Principal (net maturity closing balance under payments made), Interest Rate (`X.XX% p.a.`), **Repayment Mode: Bullet (No EMI)** (replaces Monthly EMI row), Tenure (Total) (`XX months`), and **Remaining Tenure** (`YY months left` or `Due for Payoff`).
    - **Footer Link**: `View Statement & Ledger →`.
  - Progress / status badges: "Almost there 🎉" for loans with $\le 3$ months remaining. Delete action with audit-trail safety.

 
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
- **Outstanding Balance Over Time Chart**:
  - Displayed prominently directly above the Amortization Schedule for standard amortized loans.
  - Visual comparison chart featuring two dynamic curves:
    - **Scheduled Plan (Red line)**: The baseline contractual closing balance trajectory across the loan's original tenure.
    - **Your Payments (Green line)**: The live closing balance trajectory reflecting actual recorded prepayments/part-payments and accelerated schedule payoffs.
  - Immediately recalculates and visually contracts whenever a part-payment is logged or deleted.
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
  - **Rate Revision History**: chronological ledger of repo/EBLR resets (Effective Date, Rate change `8.65% → 8.40%`, Mode, Tenure Impact, Interest Saved). Includes delete action to reverse rate revision, restore original rate/tenure, check for paid installment conflicts, and regenerate downstream schedule.
  - **Part-Payment Ledger**: record of extra payments (Date, Principal Prepaid, Accrued Broken-Period Interest, Total Paid, Mode Chosen, Net Benefit). Includes delete action to reverse part-payment, restore principal balance, check for paid installment conflicts, and regenerate downstream schedule.
- **Original Terms & Live Sync**:
  - Original principal and original tenure are preserved at loan creation as immutable reference values displayed alongside live figures (e.g. `Orig: ₹...`, `Orig: XX mos`).
  - "Sync Balance" triggers manual full re-synchronization of loan outstanding against the schedule opening balance (or gold loan scenario B ledger total cost) across single loans and portfolio-wide.

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


### Change EMI / Tenure (reducing-balance, non-gold loans)
Lets the user raise or lower the monthly EMI (the tenure follows) or propose a shorter/longer time left (the EMI follows). Button **Change EMI / Tenure** in the loan header; hidden for gold/bullet loans and flat-interest loans.
- **Inputs**: a two-way switch — *Change EMI* (amount, with −10% / +10% / +25% shortcuts) or *Change tenure* (years + months, with −1 / +1 / +2 yr shortcuts). Defaults to the loan's current EMI and months left.
- **Live preview** (debounced; nothing is saved): Monthly EMI `old → new`, Time left `old → new`, Debt-free date (vs. previous), Interest from here (saves / costs more), and the final installment when it differs from the EMI (it absorbs rounding so the balance closes at zero).
- **Feasibility line**: compares the *increase* in EMI with this month's household surplus (the dashboard's net savings): *Feasible* (fits, shows what is left), *Tight* (short by ₹X), or a plain note when the surplus cannot be loaded. A lower EMI states the monthly relief and that interest rises.
- **Rules**: the EMI must exceed the first month's interest; a plan longer than 600 months (50 years) is refused; both with a plain-language message. **Apply** is disabled when nothing would change.
- **On apply**: paid installments are kept; unpaid ones are regenerated from the next due date; the loan's EMI and total tenure are updated; the "entered EMI differs from calculated" warning is cleared (the EMI is now an explicit choice); an audit entry records old/new EMI and tenure.
- **API**: `POST /loans/:id/repayment-plan/preview` and `/apply`, body `{ mode: 'set_emi', newEmi }` or `{ mode: 'set_tenure', newTenureMonths }`.

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

## 6. Loan Closure Modal & Smart Zero-Balance Auto-Prompt
Applicable across all loan types (Home, Car, Personal, Jewel/Gold, Education, Business, Other) and responsive across Mobile, Tablet, Web, and Desktop.

### 6.1 Direct Loan Closure Action
- **Trigger**: "Close Loan" button in the Top Action Bar on the Loan Detail page.
- **Closure Modal Layout**:
  - **Header**: "Close Loan — [Loan Name]" with lender & type badge.
  - **Outstanding Balance Warning/Context**: Displays current outstanding balance (e.g., `₹0.00` or remaining balance if settling early).
  - **Reason for Full Closure Selector**:
    - Selectable radio options with clear visual icons:
      1. 💰 **Full Closure with Money**: Cleared in full using personal savings or income.
      2. 🏦 **Transfer to new bank**: Balance transfer / refinancing with another bank or NBFC.
      3. ⚡ **Foreclosure / Prepayment**: Early full principal settlement before scheduled tenure.
      4. 💎 **Asset Sale / Collateral Liquidation**: Sold financed property/vehicle or released pledged gold.
      5. 🎁 **Waived / Written Off**: Subsidized, settled via concession, or written off.
      6. 📝 **Others**: Other custom scenario.
    - **Non-Mandatory Rule Banner**:
      > *"Selecting a closure reason is optional. You can confirm loan closure directly without choosing any option."*
  - **Closure Date**: Defaults to today's date (editable).
  - **Closure Notes (Optional)**: Free-text input for personal remarks or bank closure reference number.
  - **Action Buttons**:
    - `Cancel` (Ghost button)
    - `Confirm Loan Closure` (Emerald primary button)

### 6.2 Smart Zero-Balance Auto-Prompt
- **Trigger Condition**:
  - Automatically triggered whenever:
    1. The user marks the final remaining installment as paid (`unpaidInstallments.length === 0`).
    2. A part-payment or gold loan payment reduces outstanding principal to zero or below ($\le 0$).
- **Prompt Dialog (Modal)**:
  - Header: "All Dues Cleared! 🎉"
  - Body: "There is no outstanding balance or pending EMI due on this loan. Would you like to mark this loan as fully closed now?"
  - Quick Actions:
    - `Yes, Close Loan` → Opens the Closure Reason Modal (or performs one-click closure).
    - `Keep Active / Later` → Dismisses the prompt and leaves the loan active.

### 6.3 Closed Loan State & Financial Lockdown
When a loan status is `closed`:
- **Visual Badge**: Display prominent `CLOSED` badge (emerald/slate) with closure reason and date (e.g. `CLOSED • 12 Oct 2026 • Transfer to new bank`).
- **Financial Lockdown (No Further Amounts Can Be Added)**:
  - "Make Part-Payment" button is hidden.
  - "Log Rate Revision" button is hidden.
  - "Sync Statement" / "Calibrate" is disabled.
  - "Auto EMI Queue" toggle is disengaged and disabled.
  - Amortization schedule rows are locked (cannot mark as paid/unpaid or edit values).
  - Informative Lockdown Banner: *"This loan was closed on [Date]. All dues are settled and no further payments or rate adjustments can be added."*
  - **Reopen Action**: A discreet "Reopen Loan" action is provided in Edit Terms or top actions for administrative recovery if a loan was closed by mistake.

---

## 7. Gold / Jewel Loan Running-Balance Ledger & Bullet Repayment View
When `loan_type` is **Gold / Jewel Loan** (`jewel` / `gold`):
- **Form Differences (Creation / Edit)**:
  - Disables fixed-EMI fields (no "Actual Bank EMI", no monthly principal amortisation).
  - Prompts for: Disbursal Date, Principal Amount, Annual Interest Rate (% p.a.), Maturity Tenure (default 12 months), and Upfront Fees (Processing fee, GST, and "Paid Upfront" toggle).
  - Day-count convention: Actual/365.
- **Dedicated Ledger View (Statement Style)**:
  - Replaces fixed monthly schedule with an interactive **Running-Balance Transaction Ledger**:
    - Columns: Date, Event / Type (`DISBURSAL`, `PAYMENT`, `INTEREST_POSTED`, `FEE`), Inflow / Outflow Amount, Running Outstanding Balance.
    - Each row reflects the exact balance following payments and monthly capitalised interest debited on the last calendar day of the month.
  - **Live Balances**:
    - **Current Posted Balance**: Last month-end balance after capitalisation.
    - **Unposted Accrued Interest**: Daily interest accrued so far in the current month ($\text{Balance} \times \frac{R}{365} \times \text{Days}$).
    - **Total Payoff Quote Today**: Posted Balance + Current Unposted Accrued Interest.
    - **Outstanding Principal / Net Debt**: Evaluated as the closing balance required at maturity under recorded payments (`finalClosingYours`), properly decrementing whenever a part-payment is made.
  - **Outstanding Balance Over Time Chart**:
    - Visualizes compounding balance growth with zero payments vs actual ad-hoc payments across the loan lifecycle.
  - **Collapsible Month-by-Month Table**:
    - Displays monthly interest capitalization, payments, and running closing balance.
    - **Default State**: Collapsed by default to maintain a clean layout; expands smoothly on click.
  - **Decommissioned Section**:
    - The "What you will pay by maturity" section and its three scenario cards (A/B/C) are decommissioned and removed.
  - **"+ Add Payment" Action**:
    - Records manual payments of any amount on any date.
    - Payments immediately take effect from their payment date, segmenting the month's daily interest calculation.
  - **Smart Advisory Banner**:
    - "Pay at least ₹X (this month's accrued interest) before month-end to stop your gold loan balance from compounding."

---

## 8. States
- **Empty state** (no loans yet): "No loans tracked yet — add your first loan to see its repayment schedule and payoff calculator."
- **Loan nearing payoff** (< 3 installments left): small "Almost there 🎉" badge on the card, purely informational.
- **Loan in `defaulted` status**: red badge, schedule still viewable/editable but Prepayment/Rate Revision disabled with explanatory tooltip.
