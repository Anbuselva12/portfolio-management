import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type GoldLoanTransactionType = 'DISBURSAL' | 'PAYMENT' | 'INTEREST_POSTED' | 'FEE';

export interface GoldLoanTransaction {
  id?: string;
  date: string; // YYYY-MM-DD
  type: GoldLoanTransactionType;
  amount: number | string | Decimal;
  note?: string;
}

export interface GoldLoanLedgerEntry {
  id?: string;
  date: string; // YYYY-MM-DD
  type: GoldLoanTransactionType;
  description: string;
  amount: number;
  balanceAfter: number;
  days?: number;
  segmentDetails?: string;
}

export interface GoldLoanMonthRow {
  monthKey: string; // e.g. "Sep 26"
  monthEndLabel: string; // e.g. "30 Sept 2026" or "27 Sept 2027 (maturity)"
  monthEndDate: string; // "2026-09-30"
  days: number;
  opening: number;
  payment: number;
  interest: number;
  closingYours: number;
  closingNoPay: number;
  isFirstMonth?: boolean;
  isMaturityMonth?: boolean;
}

export interface GoldLoanScenarios {
  scenarioA: {
    title: string;
    description: string;
    principal: number;
    totalInterest: number;
    finalDueAtMaturity: number;
    totalCost: number;
  };
  scenarioB: {
    title: string;
    description: string;
    totalPaidAlongWay: number;
    finalDueAtMaturity: number;
    totalInterest: number;
    totalCost: number;
    interestSavedVsA: number;
  };
  scenarioC: {
    title: string;
    description: string;
    monthlyInterestApprox: number;
    principalDueAtMaturity: number;
    totalInterestPaid: number;
    totalCost: number;
    interestSavedVsA: number;
  };
}

export interface GoldLoanChartPoint {
  monthLabel: string;
  monthEndDate: string;
  noPayments: number;
  yourPayments: number;
}

export interface GoldLoanPaymentWithSavings {
  id?: string;
  date: string;
  amount: number;
  note?: string;
  interestSavedByMaturity: number;
}

export interface GoldLoanAsOfStats {
  asOfDate: string;
  payoffAsOfDate: number;
  postedBalance: number;
  unpostedAccrued: number;
  interestChargedSoFar: number;
  paidSoFar: number;
  daysToMaturity: number;
  daysElapsed: number;
}

export interface GoldLoanCompoundingCost {
  statedRate: number;
  effectiveAnnualRate: number;
  totalInterest: number;
  simpleInterest: number;
  compoundingPenalty: number;
}

export interface GoldLoanTotals {
  totalDays: number;
  totalPayments: number;
  totalInterestYours: number;
  totalInterestNoPay: number;
  finalClosingYours: number;
  finalClosingNoPay: number;
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
  smartTip: string;
  ledger: GoldLoanLedgerEntry[];
  monthByMonth: GoldLoanMonthRow[];
  totals: GoldLoanTotals;
  scenarios: GoldLoanScenarios;
  chartData: GoldLoanChartPoint[];
  paymentsWithSavings: GoldLoanPaymentWithSavings[];
  asOfStats: GoldLoanAsOfStats;
  compoundingCost: GoldLoanCompoundingCost;
}

export class GoldLoanCalculator {
  static formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static getLastDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }

  private static formatDisplayDate(year: number, month: number, day: number): string {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    return `${day} ${monthNames[month - 1]} ${year}`;
  }

  private static formatMonthKey(year: number, month: number): string {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const yy = String(year).slice(-2);
    return `${monthNames[month - 1]} ${yy}`;
  }

  /**
   * Internal simulation for given list of manual payments from disbursal to maturity.
   */
  private static runSimulation(
    P: Decimal,
    rate: Decimal,
    dayBasis: Decimal,
    disbursalDate: Date,
    maturityDate: Date,
    payments: Array<{ id?: string; date: string; amount: Decimal; note?: string }>,
  ) {
    // Cutoff date is the day before maturity
    const cutoffDate = new Date(maturityDate.getTime() - 86400000);

    const startYear = disbursalDate.getFullYear();
    const startMonth = disbursalDate.getMonth() + 1;
    const endYear = cutoffDate.getFullYear();
    const endMonth = cutoffDate.getMonth() + 1;

    let currentYear = startYear;
    let currentMonth = startMonth;

    let runningBalance = P;
    let totalInterestPosted = new Decimal(0);
    let totalPayments = new Decimal(0);
    let totalDays = 0;

    const monthRows: Array<{
      monthKey: string;
      monthEndLabel: string;
      monthEndDate: string;
      days: number;
      opening: number;
      payment: number;
      interest: number;
      closing: number;
      isFirstMonth: boolean;
      isMaturityMonth: boolean;
      segmentNotes: string[];
    }> = [];

    const ledger: GoldLoanLedgerEntry[] = [
      {
        date: this.formatDate(disbursalDate),
        type: 'DISBURSAL',
        description: 'Loan Disbursal',
        amount: P.toNumber(),
        balanceAfter: P.toNumber(),
      },
    ];

    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
      const isFirstMonth = currentYear === startYear && currentMonth === startMonth;
      const isMaturityMonth = currentYear === endYear && currentMonth === endMonth;

      const lastDayOfCurrMonth = this.getLastDayOfMonth(currentYear, currentMonth);
      const monthStartDay = isFirstMonth ? disbursalDate.getDate() : 1;
      const monthEndDay = isMaturityMonth ? cutoffDate.getDate() : lastDayOfCurrMonth;

      const openingForMonth = runningBalance;

      // Payments in this month
      const paymentsInMonth = payments
        .filter((p) => {
          const pDate = new Date(p.date);
          return pDate.getFullYear() === currentYear && pDate.getMonth() + 1 === currentMonth;
        })
        .sort((a, b) => new Date(a.date).getDate() - new Date(b.date).getDate());

      let currentSegmentStartDay = monthStartDay;
      let monthTotalInterest = new Decimal(0);
      let monthPaymentTotal = new Decimal(0);
      const segmentNotes: string[] = [];

      for (const p of paymentsInMonth) {
        const pDay = new Date(p.date).getDate();
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
        monthPaymentTotal = monthPaymentTotal.plus(p.amount);
        totalPayments = totalPayments.plus(p.amount);

        ledger.push({
          id: p.id,
          date: p.date,
          type: 'PAYMENT',
          description: p.note || 'Payment',
          amount: p.amount.toNumber(),
          balanceAfter: runningBalance.toNumber(),
        });

        currentSegmentStartDay = pDay;
      }

      // Final segment to monthEndDay
      const finalSegmentDays = monthEndDay - currentSegmentStartDay + 1;
      if (finalSegmentDays > 0) {
        const segInterest = runningBalance
          .times(rate.dividedBy(100))
          .times(finalSegmentDays)
          .dividedBy(dayBasis);
        monthTotalInterest = monthTotalInterest.plus(segInterest);
        if (paymentsInMonth.length > 0) {
          segmentNotes.push(`${finalSegmentDays} days on ${runningBalance.toFixed(0)}`);
        }
      }

      const daysInThisMonth = monthEndDay - monthStartDay + 1;
      totalDays += daysInThisMonth;

      // Bank truncation for first month, standard rounding for others
      let roundedMonthInterest: Decimal;
      if (isFirstMonth) {
        roundedMonthInterest = monthTotalInterest.floor();
      } else {
        roundedMonthInterest = monthTotalInterest.round();
      }

      runningBalance = runningBalance.plus(roundedMonthInterest);
      totalInterestPosted = totalInterestPosted.plus(roundedMonthInterest);

      const monthEndDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(monthEndDay).padStart(2, '0')}`;
      const displayLabel = isMaturityMonth
        ? `${this.formatDisplayDate(currentYear, currentMonth, monthEndDay)} (maturity)`
        : this.formatDisplayDate(currentYear, currentMonth, monthEndDay);

      const daysLabel = isFirstMonth
        ? `${daysInThisMonth} days; bank truncated`
        : segmentNotes.length > 0
          ? segmentNotes.join(' + ')
          : `${daysInThisMonth} days`;

      ledger.push({
        date: monthEndDateStr,
        type: 'INTEREST_POSTED',
        description: `Interest (${daysLabel})`,
        amount: roundedMonthInterest.toNumber(),
        balanceAfter: runningBalance.toNumber(),
        days: daysInThisMonth,
        segmentDetails: segmentNotes.length > 0 ? segmentNotes.join(', ') : undefined,
      });

      monthRows.push({
        monthKey: this.formatMonthKey(currentYear, currentMonth),
        monthEndLabel: displayLabel,
        monthEndDate: monthEndDateStr,
        days: daysInThisMonth,
        opening: openingForMonth.toNumber(),
        payment: monthPaymentTotal.toNumber(),
        interest: roundedMonthInterest.toNumber(),
        closing: runningBalance.toNumber(),
        isFirstMonth,
        isMaturityMonth,
        segmentNotes,
      });

      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    return {
      runningBalance,
      totalInterestPosted,
      totalPayments,
      totalDays,
      monthRows,
      ledger,
    };
  }

  /**
   * Core pure calculation function for Gold / Jewel Loan running balance ledger.
   * Produces unified data for cards, scenarios, chart, month-by-month table, and ledger.
   */
  static calculateLedger(input: GoldLoanInput, asOfDateStr?: string): GoldLoanSummary {
    const P = new Decimal(input.principal);
    const rate = new Decimal(input.annualRatePercent);
    const dayBasis = new Decimal(input.dayCountBasis || 365);

    const disbursalDate = new Date(input.disbursalDate);
    const maturityDate = input.maturityDate
      ? new Date(input.maturityDate)
      : new Date(new Date(disbursalDate).setFullYear(disbursalDate.getFullYear() + 1));

    // Handle upfront fees if added to balance
    let principalWithFees = P;
    if (input.paidUpfrontFees === false && input.processingFee) {
      principalWithFees = principalWithFees.plus(new Decimal(input.processingFee));
      if (input.gst) {
        principalWithFees = principalWithFees.plus(new Decimal(input.gst));
      }
    }

    const manualPayments = (input.transactions || [])
      .filter((t) => t.type === 'PAYMENT')
      .map((t) => ({
        id: t.id,
        date: t.date,
        amount: new Decimal(t.amount),
        note: t.note || 'Payment',
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 1. Run simulation with user's payments (Scenario B)
    const simYours = this.runSimulation(
      principalWithFees,
      rate,
      dayBasis,
      disbursalDate,
      maturityDate,
      manualPayments,
    );

    // 2. Run simulation with NO payments (Scenario A)
    const simNoPay = this.runSimulation(
      principalWithFees,
      rate,
      dayBasis,
      disbursalDate,
      maturityDate,
      [],
    );

    // 3. Assemble Month-by-Month comparison table rows
    const monthByMonth: GoldLoanMonthRow[] = simYours.monthRows.map((rowYours, idx) => {
      const rowNoPay = simNoPay.monthRows[idx];
      return {
        monthKey: rowYours.monthKey,
        monthEndLabel: rowYours.monthEndLabel,
        monthEndDate: rowYours.monthEndDate,
        days: rowYours.days,
        opening: rowYours.opening,
        payment: rowYours.payment,
        interest: rowYours.interest,
        closingYours: rowYours.closing,
        closingNoPay: rowNoPay ? rowNoPay.closing : rowYours.closing,
        isFirstMonth: rowYours.isFirstMonth,
        isMaturityMonth: rowYours.isMaturityMonth,
      };
    });

    // 4. Totals
    const totals: GoldLoanTotals = {
      totalDays: simYours.totalDays,
      totalPayments: simYours.totalPayments.toNumber(),
      totalInterestYours: simYours.totalInterestPosted.toNumber(),
      totalInterestNoPay: simNoPay.totalInterestPosted.toNumber(),
      finalClosingYours: simYours.runningBalance.toNumber(),
      finalClosingNoPay: simNoPay.runningBalance.toNumber(),
    };

    // 5. Scenarios (A, B, C)
    const scenarioAClosing = simNoPay.runningBalance.toNumber();
    const scenarioATotalInterest = simNoPay.totalInterestPosted.toNumber();

    const scenarioBTotalPaid = simYours.totalPayments.toNumber();
    const scenarioBFinalDue = simYours.runningBalance.toNumber();
    const scenarioBTotalCost = scenarioBTotalPaid + scenarioBFinalDue;
    const scenarioBSaved = Math.max(0, scenarioAClosing - scenarioBTotalCost);

    // Scenario C: Pay interest each month as it accrues (balance remains P throughout)
    let scenarioCTotalInterest = new Decimal(0);
    simNoPay.monthRows.forEach((row, idx) => {
      const rawInterest = P.times(rate.dividedBy(100)).times(row.days).dividedBy(dayBasis);
      const rounded = idx === 0 ? rawInterest.floor() : rawInterest.round();
      scenarioCTotalInterest = scenarioCTotalInterest.plus(rounded);
    });
    const scenarioCTotalInterestNum = scenarioCTotalInterest.toNumber();
    const scenarioCTotalCost = P.toNumber() + scenarioCTotalInterestNum;
    const scenarioCSaved = Math.max(0, scenarioAClosing - scenarioCTotalCost);

    const scenarios: GoldLoanScenarios = {
      scenarioA: {
        title: 'Pay nothing till maturity',
        description: `Principal ₹${P.toNumber().toLocaleString('en-IN')} + total interest in one go at maturity.`,
        principal: P.toNumber(),
        totalInterest: scenarioATotalInterest,
        finalDueAtMaturity: scenarioAClosing,
        totalCost: scenarioAClosing,
      },
      scenarioB: {
        title: 'Your payments',
        description: `Total paid along way + final amount due, and interest saved vs paying nothing.`,
        totalPaidAlongWay: scenarioBTotalPaid,
        finalDueAtMaturity: scenarioBFinalDue,
        totalInterest: simYours.totalInterestPosted.toNumber(),
        totalCost: scenarioBTotalCost,
        interestSavedVsA: scenarioBSaved,
      },
      scenarioC: {
        title: "Pay each month's interest",
        description: `Pay interest as it accrues (~₹${Math.round(P.toNumber() * (rate.toNumber() / 100) / 12).toLocaleString('en-IN')}/mo). Balance stays ₹${P.toNumber().toLocaleString('en-IN')}.`,
        monthlyInterestApprox: Math.round(P.toNumber() * (rate.toNumber() / 100) / 12),
        principalDueAtMaturity: P.toNumber(),
        totalInterestPaid: scenarioCTotalInterestNum,
        totalCost: scenarioCTotalCost,
        interestSavedVsA: scenarioCSaved,
      },
    };

    // 6. Chart Data
    const chartData: GoldLoanChartPoint[] = [
      {
        monthLabel: 'Start',
        monthEndDate: this.formatDate(disbursalDate),
        noPayments: P.toNumber(),
        yourPayments: P.toNumber(),
      },
      ...simYours.monthRows.map((rowYours, idx) => {
        const rowNoPay = simNoPay.monthRows[idx];
        return {
          monthLabel: rowYours.monthKey,
          monthEndDate: rowYours.monthEndDate,
          noPayments: rowNoPay ? rowNoPay.closing : rowYours.closing,
          yourPayments: rowYours.closing,
        };
      }),
    ];

    // 7. Payment savings preview for each payment
    const paymentsWithSavings: GoldLoanPaymentWithSavings[] = manualPayments.map((p) => {
      // Run simulation excluding this specific payment to determine marginal interest saved
      const otherPayments = manualPayments.filter((op) => op !== p);
      const simWithoutP = this.runSimulation(
        principalWithFees,
        rate,
        dayBasis,
        disbursalDate,
        maturityDate,
        otherPayments,
      );
      const costWithoutP = simWithoutP.totalPayments.plus(simWithoutP.runningBalance).toNumber();
      const savedByP = Math.max(0, costWithoutP - scenarioBTotalCost);

      return {
        id: p.id,
        date: p.date,
        amount: p.amount.toNumber(),
        note: p.note,
        interestSavedByMaturity: savedByP,
      };
    });

    // 8. Stats as of selected date (default today)
    const today = new Date();
    const effectiveAsOfDate = asOfDateStr ? new Date(asOfDateStr) : today;
    const asOfDateFormatted = this.formatDate(effectiveAsOfDate);

    // Calculate payoff as of date
    let postedBalanceAsOf = P.toNumber();
    let interestChargedSoFar = 0;
    let paidSoFar = 0;
    let lastPostedDate = disbursalDate;

    // Iterate through ledger entries up to asOfDate
    for (const entry of simYours.ledger) {
      const entryDate = new Date(entry.date);
      if (entryDate <= effectiveAsOfDate) {
        postedBalanceAsOf = entry.balanceAfter;
        if (entry.type === 'INTEREST_POSTED') {
          interestChargedSoFar += entry.amount;
          lastPostedDate = entryDate;
        } else if (entry.type === 'PAYMENT') {
          paidSoFar += entry.amount;
        }
      }
    }

    // Unposted accrued interest from lastPostedDate up to effectiveAsOfDate
    let unpostedAccrued = new Decimal(0);
    if (effectiveAsOfDate > lastPostedDate && effectiveAsOfDate < maturityDate) {
      const daysDiff = Math.max(
        0,
        Math.floor((effectiveAsOfDate.getTime() - lastPostedDate.getTime()) / (1000 * 3600 * 24)),
      );
      if (daysDiff > 0) {
        unpostedAccrued = new Decimal(postedBalanceAsOf)
          .times(rate.dividedBy(100))
          .times(daysDiff)
          .dividedBy(dayBasis)
          .round();
      }
    }

    const payoffAsOfDate = new Decimal(postedBalanceAsOf).plus(unpostedAccrued).toNumber();
    const daysToMaturity = Math.max(
      0,
      Math.ceil((maturityDate.getTime() - effectiveAsOfDate.getTime()) / (1000 * 3600 * 24)),
    );
    const daysElapsed = Math.max(
      0,
      Math.floor((effectiveAsOfDate.getTime() - disbursalDate.getTime()) / (1000 * 3600 * 24)),
    );

    const asOfStats: GoldLoanAsOfStats = {
      asOfDate: asOfDateFormatted,
      payoffAsOfDate,
      postedBalance: postedBalanceAsOf,
      unpostedAccrued: unpostedAccrued.toNumber(),
      interestChargedSoFar: interestChargedSoFar + unpostedAccrued.toNumber(),
      paidSoFar,
      daysToMaturity,
      daysElapsed,
    };

    // 9. Compounding Cost Analysis
    const totalTenureYears = new Decimal(simYours.totalDays).dividedBy(365);
    const simpleInterest = P.times(rate.dividedBy(100)).times(totalTenureYears).round().toNumber();
    const compoundingPenalty = Math.max(0, scenarioATotalInterest - simpleInterest);
    // Effective Annual Rate: EAR = (1 + r/m)^m - 1
    const ear = (Math.pow(1 + rate.toNumber() / 1200, 12) - 1) * 100;

    const compoundingCost: GoldLoanCompoundingCost = {
      statedRate: rate.toNumber(),
      effectiveAnnualRate: Number(ear.toFixed(2)),
      totalInterest: scenarioATotalInterest,
      simpleInterest,
      compoundingPenalty,
    };

    // 10. Smart Tip
    // Next month end date
    const currYear = effectiveAsOfDate.getFullYear();
    const currMonth = effectiveAsOfDate.getMonth() + 1;
    const lastDayOfMonth = this.getLastDayOfMonth(currYear, currMonth);
    const nextMonthEndStr = this.formatDisplayDate(currYear, currMonth, lastDayOfMonth);
    const approxMonthlyInterest = Math.round(postedBalanceAsOf * (rate.toNumber() / 100) / 12);
    const smartTip = `Tip: pay at least this month's interest (about ₹${approxMonthlyInterest.toLocaleString('en-IN')}) before ${nextMonthEndStr} to stop the balance from growing.`;

    return {
      principal: P.toNumber(),
      annualRatePercent: rate.toNumber(),
      disbursalDate: this.formatDate(disbursalDate),
      maturityDate: this.formatDate(maturityDate),
      currentPostedBalance: postedBalanceAsOf,
      unpostedAccruedInterest: unpostedAccrued.toNumber(),
      totalPayoffQuoteToday: payoffAsOfDate,
      projectedMaturityBalance: simYours.runningBalance.toNumber(),
      totalProjectedInterest: simYours.totalInterestPosted.toNumber(),
      simpleInterestComparison: simpleInterest,
      compoundingPenalty,
      smartAdviceMonthlyInterest: approxMonthlyInterest,
      smartTip,
      ledger: simYours.ledger,
      monthByMonth,
      totals,
      scenarios,
      chartData,
      paymentsWithSavings,
      asOfStats,
      compoundingCost,
    };
  }

  /**
   * Helper to estimate live preview saving for a prospective payment amount and date.
   */
  static previewPaymentSaving(
    input: GoldLoanInput,
    paymentDate: string,
    amount: number | string | Decimal,
  ): number {
    const payAmt = new Decimal(amount);
    if (payAmt.lessThanOrEqualTo(0)) return 0;

    const currentSummary = this.calculateLedger(input);
    const prospectiveTransactions = [
      ...(input.transactions || []),
      {
        date: paymentDate,
        type: 'PAYMENT' as const,
        amount: payAmt,
        note: 'Preview Payment',
      },
    ];

    const withPaymentSummary = this.calculateLedger({
      ...input,
      transactions: prospectiveTransactions,
    });

    const currentCost = currentSummary.scenarios.scenarioB.totalCost;
    const newCost = withPaymentSummary.scenarios.scenarioB.totalCost;
    return Math.max(0, currentCost - newCost);
  }
}
