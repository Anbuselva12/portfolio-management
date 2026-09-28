import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type GoldLoanTransactionType = 'DISBURSAL' | 'PAYMENT' | 'INTEREST_POSTED' | 'FEE';

export interface GoldLoanTransaction {
  date: string; // YYYY-MM-DD
  type: GoldLoanTransactionType;
  amount: number | string | Decimal;
  note?: string;
}

export interface GoldLoanLedgerEntry {
  date: string; // YYYY-MM-DD
  type: GoldLoanTransactionType;
  description: string;
  amount: number;
  balanceAfter: number;
  days?: number;
  segmentDetails?: string;
}

export interface GoldLoanInput {
  principal: number | string | Decimal;
  annualRatePercent: number | string | Decimal;
  disbursalDate: string; // YYYY-MM-DD
  maturityDate?: string; // YYYY-MM-DD (defaults to disbursalDate + 12 months)
  dayCountBasis?: number; // default 365
  compounding?: 'MONTHLY_CAPITALISATION' | 'NONE';
  roundingMode?: 'ROUND' | 'FLOOR';
  paidUpfrontFees?: boolean;
  processingFee?: number | string | Decimal;
  gst?: number | string | Decimal;
  transactions?: GoldLoanTransaction[];
}

export interface GoldLoanSummary {
  principal: number;
  annualRatePercent: number;
  disbursalDate: string;
  maturityDate: string;
  currentPostedBalance: number;
  unpostedAccruedInterest: number;
  totalPayoffQuoteToday: number;
  projectedMaturityBalance: number;
  totalProjectedInterest: number;
  simpleInterestComparison: number;
  compoundingPenalty: number;
  smartAdviceMonthlyInterest: number;
  ledger: GoldLoanLedgerEntry[];
}

export class GoldLoanCalculator {
  /**
   * Helper to format Date to YYYY-MM-DD
   */
  static formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Helper to get last day of a given year and month (1-indexed month)
   */
  static getLastDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }

  /**
   * Core pure calculation function for Gold / Jewel Loan running balance ledger.
   * Reproduces reference test case in Story 4 §4 within ₹1.
   */
  static calculateLedger(input: GoldLoanInput, asOfDateStr?: string): GoldLoanSummary {
    const P = new Decimal(input.principal);
    const rate = new Decimal(input.annualRatePercent);
    const dayBasis = new Decimal(input.dayCountBasis || 365);
    const isCompounding = (input.compounding || 'MONTHLY_CAPITALISATION') === 'MONTHLY_CAPITALISATION';

    const disbursalDate = new Date(input.disbursalDate);
    const maturityDate = input.maturityDate
      ? new Date(input.maturityDate)
      : new Date(new Date(disbursalDate).setFullYear(disbursalDate.getFullYear() + 1));

    const asOfDate = asOfDateStr ? new Date(asOfDateStr) : maturityDate;

    // Upfront fees
    let openingBalance = P;
    if (input.paidUpfrontFees === false && input.processingFee) {
      openingBalance = openingBalance.plus(new Decimal(input.processingFee));
      if (input.gst) {
        openingBalance = openingBalance.plus(new Decimal(input.gst));
      }
    }

    const ledger: GoldLoanLedgerEntry[] = [
      {
        date: this.formatDate(disbursalDate),
        type: 'DISBURSAL',
        description: 'Loan Disbursal',
        amount: P.toNumber(),
        balanceAfter: openingBalance.toNumber(),
      },
    ];

    // Filter and sort manual payment transactions
    const manualPayments = (input.transactions || [])
      .filter((t) => t.type === 'PAYMENT')
      .map((t) => ({
        date: t.date,
        amount: new Decimal(t.amount),
        note: t.note || 'Payment',
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = openingBalance;
    let totalInterestPosted = new Decimal(0);

    // Iterate month by month from disbursal month to maturity month (or asOfDate)
    const startYear = disbursalDate.getFullYear();
    const startMonth = disbursalDate.getMonth() + 1; // 1-12
    const endYear = asOfDate.getFullYear();
    const endMonth = asOfDate.getMonth() + 1;

    let currentYear = startYear;
    let currentMonth = startMonth;

    let monthIndex = 0;

    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
      const isFirstMonth = currentYear === startYear && currentMonth === startMonth;
      const lastDayOfCurrMonth = this.getLastDayOfMonth(currentYear, currentMonth);

      // Start day in current month: for first month, day of disbursal. Otherwise day 1.
      const monthStartDay = isFirstMonth ? disbursalDate.getDate() : 1;
      const monthEndDay = lastDayOfCurrMonth;

      // Find payments in this calendar month
      const paymentsInMonth = manualPayments.filter((p) => {
        const pDate = new Date(p.date);
        return pDate.getFullYear() === currentYear && pDate.getMonth() + 1 === currentMonth;
      });

      // Segment the month by payment dates
      // Story 4 rule: payment takes effect from its own date, so new balance applies from that day onward.
      // In first month: disbursal date itself is counted as day 1 (16 to 31 = 16 days: 31 - 16 + 1 = 16).
      let currentSegmentStartDay = monthStartDay;
      let monthTotalInterest = new Decimal(0);
      const segmentNotes: string[] = [];

      // Sort payments by day
      const sortedMonthPayments = [...paymentsInMonth].sort(
        (a, b) => new Date(a.date).getDate() - new Date(b.date).getDate(),
      );

      for (const p of sortedMonthPayments) {
        const pDay = new Date(p.date).getDate();

        // Days before payment date
        // e.g. month start 1, payment on 15: days = 14 (1 to 14)
        // If first month start 16, payment on 20: days = (20 - 16) = 4 days (16, 17, 18, 19)
        const daysBeforePayment = pDay - currentSegmentStartDay;
        if (daysBeforePayment > 0) {
          const segInterest = runningBalance
            .times(rate.dividedBy(100))
            .times(daysBeforePayment)
            .dividedBy(dayBasis);
          monthTotalInterest = monthTotalInterest.plus(segInterest);
          segmentNotes.push(`${daysBeforePayment} days on ${runningBalance.toFixed(0)}`);
        }

        // Apply payment
        runningBalance = runningBalance.minus(p.amount);
        ledger.push({
          date: p.date,
          type: 'PAYMENT',
          description: p.note,
          amount: p.amount.toNumber(),
          balanceAfter: runningBalance.toNumber(),
        });

        currentSegmentStartDay = pDay;
      }

      // Final segment from currentSegmentStartDay to monthEndDay
      // Story 4: 15 May to 31 May = 17 days (31 - 15 + 1 = 17 days).
      // Disbursal 16 Dec to 31 Dec = 16 days (31 - 16 + 1 = 16 days).
      const finalSegmentDays = monthEndDay - currentSegmentStartDay + 1;
      if (finalSegmentDays > 0) {
        const segInterest = runningBalance
          .times(rate.dividedBy(100))
          .times(finalSegmentDays)
          .dividedBy(dayBasis);
        monthTotalInterest = monthTotalInterest.plus(segInterest);
        if (sortedMonthPayments.length > 0) {
          segmentNotes.push(`${finalSegmentDays} days on ${runningBalance.toFixed(0)}`);
        }
      }

      // Rounding per Story 4:
      // "Round each month's interest per roundingMode. Use FLOOR for the first part period if matching the bank, which appeared to truncate it."
      let roundedMonthInterest: Decimal;
      if (isFirstMonth) {
        roundedMonthInterest = monthTotalInterest.floor();
      } else {
        roundedMonthInterest = monthTotalInterest.round();
      }

      // Post interest on last day of month
      const monthEndDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDayOfCurrMonth).padStart(2, '0')}`;

      if (isCompounding) {
        runningBalance = runningBalance.plus(roundedMonthInterest);
      }
      totalInterestPosted = totalInterestPosted.plus(roundedMonthInterest);

      const daysLabel = isFirstMonth
        ? `${finalSegmentDays} days; bank truncated`
        : segmentNotes.length > 0
          ? segmentNotes.join(' + ')
          : `${finalSegmentDays} days`;

      ledger.push({
        date: monthEndDateStr,
        type: 'INTEREST_POSTED',
        description: `Interest (${daysLabel})`,
        amount: roundedMonthInterest.toNumber(),
        balanceAfter: runningBalance.toNumber(),
        days: isFirstMonth ? finalSegmentDays : lastDayOfCurrMonth,
        segmentDetails: segmentNotes.length > 0 ? segmentNotes.join(', ') : undefined,
      });

      monthIndex++;
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    // Current posted balance = runningBalance up to the last processed month-end
    const currentPostedBalance = runningBalance.toNumber();

    // Accrued unposted interest for current month (if today is mid-month)
    const today = new Date();
    let unpostedAccrued = new Decimal(0);
    const currMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    if (today > currMonthStart && today.getDate() < this.getLastDayOfMonth(today.getFullYear(), today.getMonth() + 1)) {
      const daysElapsed = today.getDate();
      unpostedAccrued = runningBalance.times(rate.dividedBy(100)).times(daysElapsed).dividedBy(dayBasis).round();
    }

    // Payoff quote today = posted balance + unposted accrued
    const payoffToday = runningBalance.plus(unpostedAccrued).toNumber();

    // Simple interest on original principal for comparison (P * R * T)
    const totalTenureYears = new Decimal(monthIndex).dividedBy(12);
    const trueSimpleInterest = P.times(rate.dividedBy(100)).times(totalTenureYears).round().toNumber();
    const compoundingPenalty = Math.max(0, totalInterestPosted.toNumber() - trueSimpleInterest);

    // Smart tip: pay at least 1 month's interest
    const smartAdvice = runningBalance.times(rate.dividedBy(100)).dividedBy(12).round().toNumber();

    return {
      principal: P.toNumber(),
      annualRatePercent: rate.toNumber(),
      disbursalDate: this.formatDate(disbursalDate),
      maturityDate: this.formatDate(maturityDate),
      currentPostedBalance,
      unpostedAccruedInterest: unpostedAccrued.toNumber(),
      totalPayoffQuoteToday: payoffToday,
      projectedMaturityBalance: runningBalance.toNumber(),
      totalProjectedInterest: totalInterestPosted.toNumber(),
      simpleInterestComparison: trueSimpleInterest,
      compoundingPenalty,
      smartAdviceMonthlyInterest: smartAdvice,
      ledger,
    };
  }
}
