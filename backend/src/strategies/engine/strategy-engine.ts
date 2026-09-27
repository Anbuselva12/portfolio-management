import { Decimal } from 'decimal.js';

export interface StrategyLoanInput {
  id: string;
  name?: string;
  placeOrPurpose?: string;
  lender: string;
  type: string;
  principal: Decimal;
  interestRate: Decimal;
  emiAmount: Decimal;
  tenureMonths: number;
  prepaymentPenaltyType?: string;
  prepaymentPenaltyValue?: Decimal | null;
  emiType?: 'fixed' | 'flexible';
}

export interface CustomWeights {
  weightRate: number; // e.g. 40
  weightBalance: number; // e.g. 30
  weightFlexibility: number; // e.g. 10
  weightPenalty: number; // e.g. 10
  weightTenure: number; // e.g. 10
  mode: 'cascade' | 'split';
}

export interface AllocationItem {
  loanId: string;
  name?: string;
  placeOrPurpose?: string;
  lender: string;
  type: string;
  currentPrincipal: string;
  interestRate: string;
  minimumEmi: string;
  extraAmount: string;
  totalMonthlyPayment: string;
}

export interface StrategySimulationResult {
  strategyName: 'baseline' | 'avalanche' | 'snowball' | 'custom_weighted' | 'ai_suggestion';
  title: string;
  description: string;
  monthsToDebtFree: number;
  totalInterestPaid: string;
  totalInterestSaved: string;
  payoffDate: string;
  allocations: AllocationItem[];
  timeline: {
    loanId: string;
    lender: string;
    type: string;
    payoffMonth: number;
    payoffDate: string;
  }[];
  rationale?: string;
}

export class StrategyEngine {
  /**
   * Run the baseline minimum payment simulation (no extra surplus applied)
   */
  static simulateBaseline(loans: StrategyLoanInput[]): StrategySimulationResult {
    const active = loans.filter((l) => l.principal.greaterThan(0));
    if (active.length === 0) {
      return this.emptyResult('baseline', 'Minimum Payments Only', 'Paying only standard monthly EMIs without extra prepayments.');
    }

    const { monthsToDebtFree, totalInterestPaid, timeline } = this.runSimulationLoop(active, new Decimal(0), () => ({}));

    return {
      strategyName: 'baseline',
      title: 'Minimum Payments (Baseline)',
      description: 'Pay regular EMIs on each loan with ₹0 extra prepayment.',
      monthsToDebtFree,
      totalInterestPaid: totalInterestPaid.toFixed(2),
      totalInterestSaved: '0.00',
      payoffDate: this.calculatePayoffDate(monthsToDebtFree),
      allocations: active.map((l) => ({
        loanId: l.id,
        name: l.name || l.lender,
        placeOrPurpose: l.placeOrPurpose,
        lender: l.lender,
        type: l.type,
        currentPrincipal: l.principal.toFixed(2),
        interestRate: l.interestRate.toFixed(2),
        minimumEmi: l.emiAmount.toFixed(2),
        extraAmount: '0.00',
        totalMonthlyPayment: l.emiAmount.toFixed(2),
      })),
      timeline,
    };
  }

  /**
   * Avalanche Strategy: Prioritize highest interest rate first
   */
  static simulateAvalanche(
    loans: StrategyLoanInput[],
    surplus: Decimal,
    baselineInterest: Decimal,
    prepaymentMode: 'one_off_lump_sum' | 'recurring_monthly' = 'recurring_monthly',
  ): StrategySimulationResult {
    const active = loans.filter((l) => l.principal.greaterThan(0));
    if (active.length === 0) {
      return this.emptyResult('avalanche', 'Debt Avalanche (Highest Interest First)', 'Directs surplus funds to the highest APR loan first, minimizing lifetime interest paid.');
    }
    if (surplus.lessThanOrEqualTo(0)) {
      const base = this.simulateBaseline(loans);
      return {
        ...base,
        strategyName: 'avalanche',
        title: 'Debt Avalanche (Highest Interest First)',
        description: 'Directs surplus funds to the highest APR loan first, minimizing lifetime interest paid.',
      };
    }

    // Allocate current month: 100% of surplus to highest interest rate loan
    const sorted = [...active].sort((a, b) => b.interestRate.minus(a.interestRate).toNumber());
    const topLoan = sorted[0];

    const allocationStrategy = (currentBalances: Map<string, Decimal>, extraSurplus: Decimal) => {
      // Find highest interest rate loan with balance > 0
      const target = sorted.find((l) => (currentBalances.get(l.id) || new Decimal(0)).greaterThan(0));
      if (!target) return {};
      return { [target.id]: extraSurplus };
    };

    const { monthsToDebtFree, totalInterestPaid, timeline } = this.runSimulationLoop(
      active,
      surplus,
      allocationStrategy,
      prepaymentMode,
    );
    const interestSaved = Decimal.max(0, baselineInterest.minus(totalInterestPaid));

    const isOneOff = prepaymentMode === 'one_off_lump_sum';
    return {
      strategyName: 'avalanche',
      title: 'Debt Avalanche (Highest Interest First)',
      description: isOneOff
        ? 'Directs the one-off lump sum to the highest APR loan, cutting lifetime interest and shortening tenure.'
        : 'Directs ongoing monthly surplus to the highest APR loan first, cascading as loans close.',
      monthsToDebtFree,
      totalInterestPaid: totalInterestPaid.toFixed(2),
      totalInterestSaved: interestSaved.toFixed(2),
      payoffDate: this.calculatePayoffDate(monthsToDebtFree),
      allocations: active.map((l) => {
        const extra = l.id === topLoan.id ? surplus : new Decimal(0);
        return {
          loanId: l.id,
          name: l.name || l.lender,
          placeOrPurpose: l.placeOrPurpose,
          lender: l.lender,
          type: l.type,
          currentPrincipal: l.principal.toFixed(2),
          interestRate: l.interestRate.toFixed(2),
          minimumEmi: l.emiAmount.toFixed(2),
          extraAmount: extra.toFixed(2),
          totalMonthlyPayment: l.emiAmount.plus(extra).toFixed(2),
        };
      }),
      timeline,
    };
  }

  /**
   * Snowball Strategy: Prioritize lowest outstanding balance first
   */
  static simulateSnowball(
    loans: StrategyLoanInput[],
    surplus: Decimal,
    baselineInterest: Decimal,
    prepaymentMode: 'one_off_lump_sum' | 'recurring_monthly' = 'recurring_monthly',
  ): StrategySimulationResult {
    const active = loans.filter((l) => l.principal.greaterThan(0));
    if (active.length === 0) {
      return this.emptyResult('snowball', 'Debt Snowball (Lowest Balance First)', 'Clears smallest loans first to build quick psychological momentum and eliminate monthly debt obligations.');
    }
    if (surplus.lessThanOrEqualTo(0)) {
      const base = this.simulateBaseline(loans);
      return {
        ...base,
        strategyName: 'snowball',
        title: 'Debt Snowball (Lowest Balance First)',
        description: 'Clears smallest loans first to build quick psychological momentum and eliminate monthly debt obligations.',
      };
    }

    // Sort by principal balance ascending
    const sorted = [...active].sort((a, b) => a.principal.minus(b.principal).toNumber());
    const topLoan = sorted[0];

    const allocationStrategy = (currentBalances: Map<string, Decimal>, extraSurplus: Decimal) => {
      const target = sorted.find((l) => (currentBalances.get(l.id) || new Decimal(0)).greaterThan(0));
      if (!target) return {};
      return { [target.id]: extraSurplus };
    };

    const { monthsToDebtFree, totalInterestPaid, timeline } = this.runSimulationLoop(
      active,
      surplus,
      allocationStrategy,
      prepaymentMode,
    );
    const interestSaved = Decimal.max(0, baselineInterest.minus(totalInterestPaid));

    const isOneOff = prepaymentMode === 'one_off_lump_sum';
    return {
      strategyName: 'snowball',
      title: 'Debt Snowball (Lowest Balance First)',
      description: isOneOff
        ? 'Directs the one-off lump sum to the smallest balance loan to wipe it out fastest or cut it down dramatically.'
        : 'Clears smallest loans first to build quick psychological momentum and eliminate monthly debt obligations.',
      monthsToDebtFree,
      totalInterestPaid: totalInterestPaid.toFixed(2),
      totalInterestSaved: interestSaved.toFixed(2),
      payoffDate: this.calculatePayoffDate(monthsToDebtFree),
      allocations: active.map((l) => {
        const extra = l.id === topLoan.id ? surplus : new Decimal(0);
        return {
          loanId: l.id,
          name: l.name || l.lender,
          placeOrPurpose: l.placeOrPurpose,
          lender: l.lender,
          type: l.type,
          currentPrincipal: l.principal.toFixed(2),
          interestRate: l.interestRate.toFixed(2),
          minimumEmi: l.emiAmount.toFixed(2),
          extraAmount: extra.toFixed(2),
          totalMonthlyPayment: l.emiAmount.plus(extra).toFixed(2),
        };
      }),
      timeline,
    };
  }

  /**
   * Custom-Weighted Strategy: Composite scoring across Rate, Balance, Flexibility, Penalty, Tenure
   */
  static simulateCustomWeighted(
    loans: StrategyLoanInput[],
    surplus: Decimal,
    weights: CustomWeights,
    baselineInterest: Decimal,
    prepaymentMode: 'one_off_lump_sum' | 'recurring_monthly' = 'recurring_monthly',
  ): StrategySimulationResult {
    const active = loans.filter((l) => l.principal.greaterThan(0));
    if (active.length === 0) {
      return this.emptyResult('custom_weighted', 'Custom-Weighted Strategy', `Tailored balance across ${weights.weightRate}% APR, ${weights.weightBalance}% Balance, and debt flexibility in ${weights.mode} mode.`);
    }
    if (surplus.lessThanOrEqualTo(0)) {
      const base = this.simulateBaseline(loans);
      return {
        ...base,
        strategyName: 'custom_weighted',
        title: 'Custom-Weighted Strategy',
        description: `Tailored balance across ${weights.weightRate}% APR, ${weights.weightBalance}% Balance, and debt flexibility in ${weights.mode} mode.`,
      };
    }

    // Max references for normalization
    const maxRate = Decimal.max(...active.map((l) => l.interestRate), new Decimal(1));
    const maxBal = Decimal.max(...active.map((l) => l.principal), new Decimal(1));
    const maxTenure = Math.max(...active.map((l) => l.tenureMonths), 1);

    const scores = new Map<string, number>();
    for (const l of active) {
      const rNorm = l.interestRate.dividedBy(maxRate).toNumber();
      const bNorm = 1 - l.principal.dividedBy(maxBal).toNumber(); // smaller balance gets higher score
      const fNorm = l.emiType === 'flexible' ? 1.0 : 0.5;
      const hasPenalty = l.prepaymentPenaltyType && l.prepaymentPenaltyType !== 'none';
      const pNorm = hasPenalty ? 0.3 : 1.0;
      const tNorm = 1 - l.tenureMonths / maxTenure;

      const score =
        (weights.weightRate * rNorm +
          weights.weightBalance * bNorm +
          weights.weightFlexibility * fNorm +
          weights.weightPenalty * pNorm +
          weights.weightTenure * tNorm) /
        100;
      scores.set(l.id, score);
    }

    const sorted = [...active].sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));

    // Current month extra allocations
    const currentAllocations = new Map<string, Decimal>();
    if (weights.mode === 'split') {
      const totalScore = sorted.reduce((sum, l) => sum + (scores.get(l.id) || 0), 0);
      let allocatedSoFar = new Decimal(0);
      for (let i = 0; i < sorted.length; i++) {
        const l = sorted[i];
        if (i === sorted.length - 1) {
          currentAllocations.set(l.id, surplus.minus(allocatedSoFar));
        } else {
          const share = totalScore > 0 ? (scores.get(l.id) || 0) / totalScore : 1 / sorted.length;
          const amt = surplus.times(share).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
          currentAllocations.set(l.id, amt);
          allocatedSoFar = allocatedSoFar.plus(amt);
        }
      }
    } else {
      // cascade: 100% to highest score
      currentAllocations.set(sorted[0].id, surplus);
    }

    const allocationStrategy = (currentBalances: Map<string, Decimal>, extraSurplus: Decimal) => {
      const result: Record<string, Decimal> = {};
      const remainingLoans = sorted.filter((l) => (currentBalances.get(l.id) || new Decimal(0)).greaterThan(0));
      if (remainingLoans.length === 0) return result;

      if (weights.mode === 'split') {
        const totalRemScore = remainingLoans.reduce((sum, l) => sum + (scores.get(l.id) || 0), 0);
        let alloc = new Decimal(0);
        for (let i = 0; i < remainingLoans.length; i++) {
          const l = remainingLoans[i];
          if (i === remainingLoans.length - 1) {
            result[l.id] = extraSurplus.minus(alloc);
          } else {
            const share = totalRemScore > 0 ? (scores.get(l.id) || 0) / totalRemScore : 1 / remainingLoans.length;
            const amt = extraSurplus.times(share).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
            result[l.id] = amt;
            alloc = alloc.plus(amt);
          }
        }
      } else {
        result[remainingLoans[0].id] = extraSurplus;
      }
      return result;
    };

    const { monthsToDebtFree, totalInterestPaid, timeline } = this.runSimulationLoop(
      active,
      surplus,
      allocationStrategy,
      prepaymentMode,
    );
    const interestSaved = Decimal.max(0, baselineInterest.minus(totalInterestPaid));

    return {
      strategyName: 'custom_weighted',
      title: 'Custom-Weighted Strategy',
      description: `Tailored balance across ${weights.weightRate}% APR, ${weights.weightBalance}% Balance, and debt flexibility in ${weights.mode} mode.`,
      monthsToDebtFree,
      totalInterestPaid: totalInterestPaid.toFixed(2),
      totalInterestSaved: interestSaved.toFixed(2),
      payoffDate: this.calculatePayoffDate(monthsToDebtFree),
      allocations: active.map((l) => {
        const extra = currentAllocations.get(l.id) || new Decimal(0);
        return {
          loanId: l.id,
          name: l.name || l.lender,
          placeOrPurpose: l.placeOrPurpose,
          lender: l.lender,
          type: l.type,
          currentPrincipal: l.principal.toFixed(2),
          interestRate: l.interestRate.toFixed(2),
          minimumEmi: l.emiAmount.toFixed(2),
          extraAmount: extra.toFixed(2),
          totalMonthlyPayment: l.emiAmount.plus(extra).toFixed(2),
        };
      }),
      timeline,
    };
  }

  /**
   * AI Strategy Simulation with allocations suggested by Gemini
   */
  static simulateAiStrategy(
    loans: StrategyLoanInput[],
    surplus: Decimal,
    aiAllocations: { loanId: string; extraAmount: string }[],
    rationale: string,
    baselineInterest: Decimal,
    prepaymentMode: 'one_off_lump_sum' | 'recurring_monthly' = 'recurring_monthly',
  ): StrategySimulationResult {
    const active = loans.filter((l) => l.principal.greaterThan(0));
    const allocMap = new Map<string, Decimal>();
    for (const a of aiAllocations) {
      allocMap.set(a.loanId, new Decimal(a.extraAmount || 0));
    }

    // Dynamic allocator: uses AI allocations while target loans have balance, then cascades
    const allocationStrategy = (currentBalances: Map<string, Decimal>, extraSurplus: Decimal) => {
      const result: Record<string, Decimal> = {};
      let remainingSurplus = new Decimal(extraSurplus);

      for (const [loanId, amt] of allocMap.entries()) {
        const bal = currentBalances.get(loanId) || new Decimal(0);
        if (bal.greaterThan(0) && remainingSurplus.greaterThan(0)) {
          const toPay = Decimal.min(amt, remainingSurplus);
          result[loanId] = toPay;
          remainingSurplus = remainingSurplus.minus(toPay);
        }
      }

      // If any surplus remains unallocated, cascade to highest rate remaining loan
      if (remainingSurplus.greaterThan(0)) {
        const remainingLoans = [...active]
          .filter((l) => (currentBalances.get(l.id) || new Decimal(0)).greaterThan(0))
          .sort((a, b) => b.interestRate.minus(a.interestRate).toNumber());
        if (remainingLoans.length > 0) {
          result[remainingLoans[0].id] = (result[remainingLoans[0].id] || new Decimal(0)).plus(remainingSurplus);
        }
      }
      return result;
    };

    const { monthsToDebtFree, totalInterestPaid, timeline } = this.runSimulationLoop(
      active,
      surplus,
      allocationStrategy,
      prepaymentMode,
    );
    const interestSaved = Decimal.max(0, baselineInterest.minus(totalInterestPaid));

    return {
      strategyName: 'ai_suggestion',
      title: 'AI Smart Plan (Gemini)',
      description: 'Personalized AI allocation based on cash-flow safety, high interest penalty elimination, and balance momentum.',
      monthsToDebtFree,
      totalInterestPaid: totalInterestPaid.toFixed(2),
      totalInterestSaved: interestSaved.toFixed(2),
      payoffDate: this.calculatePayoffDate(monthsToDebtFree),
      allocations: active.map((l) => {
        const extra = allocMap.get(l.id) || new Decimal(0);
        return {
          loanId: l.id,
          name: l.name || l.lender,
          placeOrPurpose: l.placeOrPurpose,
          lender: l.lender,
          type: l.type,
          currentPrincipal: l.principal.toFixed(2),
          interestRate: l.interestRate.toFixed(2),
          minimumEmi: l.emiAmount.toFixed(2),
          extraAmount: extra.toFixed(2),
          totalMonthlyPayment: l.emiAmount.plus(extra).toFixed(2),
        };
      }),
      timeline,
      rationale,
    };
  }

  /**
   * Month-by-month debt reduction simulation loop
   */
  private static runSimulationLoop(
    loans: StrategyLoanInput[],
    initialSurplus: Decimal,
    allocationFn: (currentBalances: Map<string, Decimal>, availableSurplus: Decimal) => Record<string, Decimal>,
    prepaymentMode: 'one_off_lump_sum' | 'recurring_monthly' = 'recurring_monthly',
  ): { monthsToDebtFree: number; totalInterestPaid: Decimal; timeline: any[] } {
    const balances = new Map<string, Decimal>();
    const monthlyRates = new Map<string, Decimal>();
    const originalEmis = new Map<string, Decimal>();
    const payoffMonths = new Map<string, number>();

    for (const l of loans) {
      balances.set(l.id, new Decimal(l.principal));
      monthlyRates.set(l.id, l.interestRate.dividedBy(1200));
      originalEmis.set(l.id, new Decimal(l.emiAmount));
    }

    let totalInterestPaid = new Decimal(0);
    let month = 0;
    const maxMonths = 360; // 30-year safety cap
    let rollingSurplus = new Decimal(initialSurplus);

    while (month < maxMonths) {
      const activeLoans = loans.filter((l) => (balances.get(l.id) || new Decimal(0)).greaterThan(0.01));
      if (activeLoans.length === 0) break;

      month++;
      // Determine extra allocations for this month
      let extraAllocs: Record<string, Decimal> = {};
      if (prepaymentMode === 'one_off_lump_sum') {
        if (month === 1) {
          extraAllocs = allocationFn(balances, initialSurplus);
        }
      } else {
        extraAllocs = allocationFn(balances, rollingSurplus);
      }

      for (const loan of activeLoans) {
        let bal = balances.get(loan.id)!;
        const r = monthlyRates.get(loan.id)!;
        const interest = bal.times(r).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        totalInterestPaid = totalInterestPaid.plus(interest);

        // Required regular EMI
        const regularEmi = originalEmis.get(loan.id)!;
        const extraPayment = extraAllocs[loan.id] || new Decimal(0);
        const totalPayment = regularEmi.plus(extraPayment);

        const principalReduction = totalPayment.minus(interest);

        if (principalReduction.greaterThanOrEqualTo(bal)) {
          // Loan paid off this month!
          balances.set(loan.id, new Decimal(0));
          if (!payoffMonths.has(loan.id)) {
            payoffMonths.set(loan.id, month);
            // Freed up EMI joins the rolling surplus cascade ONLY in recurring mode!
            if (prepaymentMode === 'recurring_monthly') {
              rollingSurplus = rollingSurplus.plus(regularEmi);
            }
          }
        } else {
          balances.set(loan.id, bal.minus(principalReduction));
        }
      }
    }

    const timeline = loans.map((l) => {
      const pMonth = payoffMonths.get(l.id) || month;
      return {
        loanId: l.id,
        lender: l.lender,
        type: l.type,
        payoffMonth: pMonth,
        payoffDate: this.calculatePayoffDate(pMonth),
      };
    });

    return {
      monthsToDebtFree: month,
      totalInterestPaid,
      timeline,
    };
  }

  private static calculatePayoffDate(monthsFromNow: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() + monthsFromNow);
    return d.toISOString().split('T')[0];
  }

  private static emptyResult(
    strategyName: any,
    title: string,
    description: string,
  ): StrategySimulationResult {
    return {
      strategyName,
      title,
      description,
      monthsToDebtFree: 0,
      totalInterestPaid: '0.00',
      totalInterestSaved: '0.00',
      payoffDate: new Date().toISOString().split('T')[0],
      allocations: [],
      timeline: [],
    };
  }
}

