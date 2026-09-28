# Task: Add "Gold Loan" support to my loan tracker

Add a loan type GOLD_LOAN. It is a running-balance account (like an overdraft)
with bullet repayment, not a fixed-schedule loan. Build it as its own
calculator module, isolated from any existing loan calculation code, and
select it via `loanType = GOLD_LOAN`.

## 1. How a gold loan works

- There is no repayment schedule and no auto-debit. The user may pay any
  amount, on any date, or nothing at all. Every payment is a manual entry.
- The balance is a running ledger built from actual transactions. Negative
  means outstanding (show it as a positive "outstanding" in the UI).
- Interest accrues DAILY on the outstanding balance: balance x rate / 365.
- Accrued interest is debited on the LAST DAY of each month and ADDED to the
  balance (capitalised). The next month's interest is then charged on the larger
  balance, so this is monthly compounding.
- The principal reduces only when a payment exceeds the accrued interest.
- Bullet repayment: the full outstanding is due at maturity (typically 12
  months) or whenever the user closes the loan, for example a one-go payment at
  the end of the year.

## 2. Data model

- loanType = GOLD_LOAN
- principal (amount disbursed, e.g. 390000)
- annualRatePercent (e.g. 11)
- disbursalDate
- maturityDate (optional, default disbursalDate + 12 months)
- dayCountBasis = 365 (configurable)
- compounding = MONTHLY_CAPITALISATION (configurable: MONTHLY_CAPITALISATION | NONE)
- roundingMode = ROUND (configurable: ROUND | FLOOR)
- upfrontFees: processingFee, gst, and `paidUpfront` boolean.
  If paidUpfront = true, fees are NOT added to the interest base.
  If false, add them to the opening balance.
- transactions[]: { date, type: DISBURSAL | PAYMENT | INTEREST_POSTED | FEE, amount, note }

## 3. Calculation algorithm (implement exactly)

Maintain a running outstanding balance. For each calendar month:

1. Split the month at every PAYMENT date. A payment takes effect from its own
   date, so the new balance applies from that day onward.
2. For each segment: interest = balance x (annualRate/100) x days / 365,
   where days = number of calendar days in the segment.
3. Sum the segment interests for the month.
4. On the LAST DAY of the month, post the total as an INTEREST_POSTED entry and
   add it to the balance (if compounding = MONTHLY_CAPITALISATION).
5. In the first partial month, count the disbursal date itself as day 1
   (16 Dec to 31 Dec = 16 days).
6. Round each month's interest per roundingMode. Use FLOOR for the first part
   period if matching the bank, which appeared to truncate it.
7. Always use actual days in the month (Feb = 28 or 29), never a flat 30.

## 4. Reference test case (must reproduce within Rs 1)

Loan: principal 390000, 11% p.a., disbursed 16/12/2025, fees paid upfront.
One extra payment: 5000 on 15/05/2026.

| Date | Event | Amount | Balance after |
|---|---|---|---|
| 31/12/2025 | Interest (16 days; calc 1880.55, bank truncated) | 1880 | 391,880 |
| 31/01/2026 | Interest (31 days) | 3661 | 395,541 |
| 28/02/2026 | Interest (28 days) | 3338 | 398,879 |
| 31/03/2026 | Interest (31 days) | 3727 | 402,606 |
| 30/04/2026 | Interest (30 days) | 3640 | 406,246 |
| 15/05/2026 | Payment | 5000 | 401,246 |
| 31/05/2026 | Interest (14 days on 406,246 + 17 days on 401,246) | 3770 | 405,016 |
| 30/06/2026 | Interest (30 days) | 3662 | 408,678 |
| 31/07/2026 | Interest (31 days) | 3818 | 412,496 |
| 31/08/2026 | Interest (31 days) | 3854 | 416,350 |

Write unit tests from this table.

## 5. Features

1. Ledger view: all transactions with running balance, styled like a bank
   statement.
2. "Add payment": any amount, any date. Recalculate everything after that date.
3. Current outstanding as of today: posted balance + accrued interest for the
   current month not yet posted. Show these two separately.
4. Projection: if no more payments are made, show the balance at maturity and
   total interest.
5. Payoff quote for any chosen date: balance + accrued interest up to that date.
   This supports the one-go closure at the end of the year.
6. Compounding cost: total interest charged vs. true simple interest on the
   original principal, and the difference.
7. Effective annual rate vs. stated rate.
8. Smart tip: "Pay at least this month's interest (about Rs X) before
   month-end to stop the balance from growing." Compute X from current data.
9. What-if simulator: input a payment amount and date, then show interest saved
   by month end and by maturity.
10. Reminders: last day of each month (interest posting) and the maturity date.
    No auto-debit logic, since payments are manual entries only.
11. Reconcile: let the user enter the bank's posted interest for a month and flag
    any difference from the calculated value.

## 6. Constraints

- Use integer paise or a decimal library for money, never floats.
- Validate: payment date >= disbursal date; no future-dated interest postings;
  warn (do not block) if a payment exceeds outstanding + accrued interest.
- Make the calculator a pure function: (loan, transactions, asOfDate) -> ledger,
  so it is easy to test.

Before coding, briefly show me the plan: files to change, the data model, and
how the gold loan calculator is wired in. Then implement.