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
  percentage?: number;
  interestSaved?: string;
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
  loanInterestPaid?: Record<string, string>;
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

    const { monthsToDebtFree, totalInterestPaid, timeline, loanInterestPaid } = this.runSimulationLoop(active, new Decimal(0), () => ({}));

    const baselineLoanInterestRecord: Record<string, string> = {};
    for (const [k, v] of loanInterestPaid.entries()) {
      baselineLoanInterestRecord[k] = v.toFixed(2);
    }

    return {
      strategyName: 'baseline',
      title: 'Minimum Payments (Baseline)',
      description: 'Pay regular EMIs on each loan with ₹0 extra prepayment.',
      monthsToDebtFree,
      totalInterestPaid: totalInterestPaid.toFixed(2),
      totalInterestSaved: '0.00',
      payoffDate: this.calculatePayoffDate(monthsToDebtFree),
      allocations: active.map((l) => {
        const isGold = l.type === 'jewel' || l.type === 'gold';
        const minEmi = isGold ? new Decimal(0) : l.emiAmount;
        return {
          loanId: l.id,
          name: l.name || l.lender,
          placeOrPurpose: l.placeOrPurpose,
          lender: l.lender,
          type: l.type,
          currentPrincipal: l.principal.toFixed(2),
          interestRate: l.interestRate.toFixed(2),
          minimumEmi: minEmi.toFixed(2),
          extraAmount: '0.00',
          totalMonthlyPayment: minEmi.toFixed(2),
          percentage: 0,
          interestSaved: '0.00',
        };
      }),
      timeline,
      loanInterestPaid: baselineLoanInterestRecord,
    };
  }

  /**
   * Helper: allocate surplus across prioritized loans in cascade order
   * ensuring no excess is wasted when a loan reaches zero.
   */
  public static cascadeSurplusAcrossRankedLoans(
    rankedLoans: StrategyLoanInput[],
    currentBalances: Map<string, Decimal>,
    surplus: Decimal,
  ): Record<string, Decimal> {
    const result: Record<string, Decimal> = {};
    let remainingSurplus = new Decimal(surplus);

    for (const loan of rankedLoans) {
      if (remainingSurplus.lessThanOrEqualTo(0)) break;
      const bal = currentBalances.get(loan.id) || new Decimal(loan.principal);
      if (bal.greaterThan(0)) {
        // Allocate up to the current balance of this loan
        const toAllocate = Decimal.min(remainingSurplus, bal);
        if (toAllocate.greaterThan(0)) {
          result[loan.id] = toAllocate;
          remainingSurplus = remainingSurplus.minus(toAllocate);
        }
      }
    }
    return result;
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

    // Sort by interest rate descending (ties broken by smaller balance)
    const sorted = [...active].sort((a, b) => {
      const rateDiff = b.interestRate.minus(a.interestRate).toNumber();
      if (rateDiff !== 0) return rateDiff;
      return a.principal.minus(b.principal).toNumber();
    });

    const initialBalances = new Map<string, Decimal>();
    for (const l of active) {
      initialBalances.set(l.id, new Decimal(l.principal));
    }
    const initialCascade = this.cascadeSurplusAcrossRankedLoans(sorted, initialBalances, surplus);

    const allocationStrategy = (currentBalances: Map<string, Decimal>, extraSurplus: Decimal) => {
      return this.cascadeSurplusAcrossRankedLoans(sorted, currentBalances, extraSurplus);
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
        ? 'Directs the one-off lump sum to the highest APR loan, cutting lifetime interest and cascading to subsequent loans as balances clear.'
        : 'Directs ongoing monthly surplus to the highest APR loan first, cascading as loans close.',
      monthsToDebtFree,
      totalInterestPaid: totalInterestPaid.toFixed(2),
      totalInterestSaved: interestSaved.toFixed(2),
      payoffDate: this.calculatePayoffDate(monthsToDebtFree),
      allocations: active.map((l) => {
        const extra = initialCascade[l.id] || new Decimal(0);
        const isGold = l.type === 'jewel' || l.type === 'gold';
        const minEmi = isGold ? new Decimal(0) : l.emiAmount;
        return {
          loanId: l.id,
          name: l.name || l.lender,
          placeOrPurpose: l.placeOrPurpose,
          lender: l.lender,
          type: l.type,
          currentPrincipal: l.principal.toFixed(2),
          interestRate: l.interestRate.toFixed(2),
          minimumEmi: minEmi.toFixed(2),
          extraAmount: extra.toFixed(2),
          totalMonthlyPayment: minEmi.plus(extra).toFixed(2),
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

    // Sort by principal balance ascending (ties broken by higher interest rate)
    const sorted = [...active].sort((a, b) => {
      const balDiff = a.principal.minus(b.principal).toNumber();
      if (balDiff !== 0) return balDiff;
      return b.interestRate.minus(a.interestRate).toNumber();
    });

    const initialBalances = new Map<string, Decimal>();
    for (const l of active) {
      initialBalances.set(l.id, new Decimal(l.principal));
    }
    const initialCascade = this.cascadeSurplusAcrossRankedLoans(sorted, initialBalances, surplus);

    const allocationStrategy = (currentBalances: Map<string, Decimal>, extraSurplus: Decimal) => {
      return this.cascadeSurplusAcrossRankedLoans(sorted, currentBalances, extraSurplus);
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
        ? 'Directs the one-off lump sum to the smallest balance loans first, cascading to larger loans as debts are cleared.'
        : 'Clears smallest loans first to build quick psychological momentum and eliminate monthly debt obligations.',
      monthsToDebtFree,
      totalInterestPaid: totalInterestPaid.toFixed(2),
      totalInterestSaved: interestSaved.toFixed(2),
      payoffDate: this.calculatePayoffDate(monthsToDebtFree),
      allocations: active.map((l) => {
        const extra = initialCascade[l.id] || new Decimal(0);
        const isGold = l.type === 'jewel' || l.type === 'gold';
        const minEmi = isGold ? new Decimal(0) : l.emiAmount;
        return {
          loanId: l.id,
          name: l.name || l.lender,
          placeOrPurpose: l.placeOrPurpose,
          lender: l.lender,
          type: l.type,
          currentPrincipal: l.principal.toFixed(2),
          interestRate: l.interestRate.toFixed(2),
          minimumEmi: minEmi.toFixed(2),
          extraAmount: extra.toFixed(2),
          totalMonthlyPayment: minEmi.plus(extra).toFixed(2),
        };
      }),
      timeline,
    };
  }

  /**
   * Custom-Weighted Strategy: Composite scoring across Rate, Balance, Flexibility, Penalty, Tenure
   */
  /**
   * Custom-Weighted Strategy: User slider-controlled percentage allocation across active debts
   * (Default: 100% to highest principal loan, 0% to remaining loans, auto-balanced to 100%).
   */
  static simulateCustomWeighted(
    loans: StrategyLoanInput[],
    surplus: Decimal,
    weights: CustomWeights,
    baselineInterest: Decimal,
    prepaymentMode: 'one_off_lump_sum' | 'recurring_monthly' = 'recurring_monthly',
    loanPercentages?: Record<string, number>,
    baselineLoanInterestPaid?: Record<string, string>,
  ): StrategySimulationResult {
    const active = loans.filter((l) => l.principal.greaterThan(0));
    if (active.length === 0) {
      return this.emptyResult('custom_weighted', 'Custom-Weighted Strategy', 'Interactive percentage-based allocation across active debts.');
    }
    if (surplus.lessThanOrEqualTo(0)) {
      const base = this.simulateBaseline(loans);
      return {
        ...base,
        strategyName: 'custom_weighted',
        title: 'Custom-Weighted Strategy',
        description: 'Interactive percentage-based allocation across active debts.',
      };
    }

    // 1. Identify highest principal loan as the default anchor
    const sortedByPrincipal = [...active].sort((a, b) => {
      const balDiff = b.principal.minus(a.principal).toNumber();
      if (balDiff !== 0) return balDiff;
      return b.interestRate.minus(a.interestRate).toNumber();
    });
    const highestLoan = sortedByPrincipal[0];

    // 2. Resolve percentages per loan
    const effectivePercentages: Record<string, number> = {};
    if (loanPercentages && Object.keys(loanPercentages).length > 0) {
      let sum = 0;
      for (const l of active) {
        const val = Math.max(0, Math.min(100, Math.round(Number(loanPercentages[l.id]) || 0)));
        effectivePercentages[l.id] = val;
        sum += val;
      }
      // Reconcile to exactly 100% if sum deviates
      if (sum !== 100) {
        const diff = 100 - sum;
        const currentHighest = effectivePercentages[highestLoan.id] ?? 0;
        effectivePercentages[highestLoan.id] = Math.max(0, Math.min(100, currentHighest + diff));
      }
    } else if (weights && weights.mode === 'split') {
      const maxRate = Decimal.max(...active.map((l) => l.interestRate), new Decimal(1));
      const maxBal = Decimal.max(...active.map((l) => l.principal), new Decimal(1));
      const maxTenure = Math.max(...active.map((l) => l.tenureMonths), 1);

      const scores = new Map<string, number>();
      for (const l of active) {
        const rNorm = l.interestRate.dividedBy(maxRate).toNumber();
        const bNorm = 1 - l.principal.dividedBy(maxBal).toNumber();
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

      const totalScore = active.reduce((sum, l) => sum + (scores.get(l.id) || 0), 0);
      let sumPct = 0;
      for (let i = 0; i < active.length; i++) {
        const l = active[i];
        if (i === active.length - 1) {
          effectivePercentages[l.id] = Math.max(0, 100 - sumPct);
        } else {
          const share = totalScore > 0 ? (scores.get(l.id) || 0) / totalScore : 1 / active.length;
          const pct = Math.round(share * 100);
          effectivePercentages[l.id] = pct;
          sumPct += pct;
        }
      }
    } else {
      // Default: 100% to highest principal loan, 0% to others
      for (const l of active) {
        effectivePercentages[l.id] = l.id === highestLoan.id ? 100 : 0;
      }
    }

    // 3. Compute initial allocation per loan from surplus
    const initialAllocs: Record<string, Decimal> = {};
    for (const l of active) {
      const pct = effectivePercentages[l.id] || 0;
      if (pct > 0) {
        const share = surplus.times(pct).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        initialAllocs[l.id] = share;
      } else {
        initialAllocs[l.id] = new Decimal(0);
      }
    }

    // Allocation function for simulation loop with cascading overflow
    const allocationStrategy = (currentBalances: Map<string, Decimal>, extraSurplus: Decimal) => {
      const result: Record<string, Decimal> = {};
      let remainingSurplus = new Decimal(extraSurplus);

      // First pass: proportional allocation based on configured percentages
      for (const l of active) {
        const bal = currentBalances.get(l.id) || new Decimal(0);
        const pct = effectivePercentages[l.id] || 0;
        if (bal.greaterThan(0) && pct > 0 && remainingSurplus.greaterThan(0)) {
          const targetAmt = extraSurplus.times(pct).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
          const actualAmt = Decimal.min(targetAmt, bal, remainingSurplus);
          result[l.id] = actualAmt;
          remainingSurplus = remainingSurplus.minus(actualAmt);
        }
      }

      // Second pass: cascade excess from loans that reached 0 to remaining loans with highest balance
      if (remainingSurplus.greaterThan(0)) {
        const remainingLoans = sortedByPrincipal.filter(
          (l) => (currentBalances.get(l.id) || new Decimal(0)).minus(result[l.id] || new Decimal(0)).greaterThan(0),
        );
        for (const l of remainingLoans) {
          if (remainingSurplus.lessThanOrEqualTo(0)) break;
          const bal = currentBalances.get(l.id) || new Decimal(0);
          const already = result[l.id] || new Decimal(0);
          const canAbsorb = bal.minus(already);
          if (canAbsorb.greaterThan(0)) {
            const addAmt = Decimal.min(remainingSurplus, canAbsorb);
            result[l.id] = already.plus(addAmt);
            remainingSurplus = remainingSurplus.minus(addAmt);
          }
        }
      }
      return result;
    };

    const { monthsToDebtFree, totalInterestPaid, timeline, loanInterestPaid } = this.runSimulationLoop(
      active,
      surplus,
      allocationStrategy,
      prepaymentMode,
    );
    const interestSaved = Decimal.max(0, baselineInterest.minus(totalInterestPaid));

    // Build human-friendly description showing distribution
    const splitPercentages: string[] = [];
    for (const l of active) {
      const pct = effectivePercentages[l.id] || 0;
      if (pct > 0) {
        splitPercentages.push(`${pct}% to ${l.name || l.lender}`);
      }
    }
    const description = splitPercentages.length > 0
      ? `Allocated: ${splitPercentages.join(', ')}.`
      : 'Interactive percentage-based allocation across active debts.';

    return {
      strategyName: 'custom_weighted',
      title: 'Custom-Weighted Strategy',
      description,
      monthsToDebtFree,
      totalInterestPaid: totalInterestPaid.toFixed(2),
      totalInterestSaved: interestSaved.toFixed(2),
      payoffDate: this.calculatePayoffDate(monthsToDebtFree),
      allocations: active.map((l) => {
        const extra = initialAllocs[l.id] || new Decimal(0);
        const isGold = l.type === 'jewel' || l.type === 'gold';
        const minEmi = isGold ? new Decimal(0) : l.emiAmount;
        const basePaid = baselineLoanInterestPaid && baselineLoanInterestPaid[l.id]
          ? new Decimal(baselineLoanInterestPaid[l.id])
          : new Decimal(0);
        const thisPaid = loanInterestPaid.get(l.id) || new Decimal(0);
        const loanSavings = Decimal.max(0, basePaid.minus(thisPaid));

        return {
          loanId: l.id,
          name: l.name || l.lender,
          placeOrPurpose: l.placeOrPurpose,
          lender: l.lender,
          type: l.type,
          currentPrincipal: l.principal.toFixed(2),
          interestRate: l.interestRate.toFixed(2),
          minimumEmi: minEmi.toFixed(2),
          extraAmount: extra.toFixed(2),
          totalMonthlyPayment: minEmi.plus(extra).toFixed(2),
          percentage: effectivePercentages[l.id] || 0,
          interestSaved: loanSavings.toFixed(2),
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
        const isGold = l.type === 'jewel' || l.type === 'gold';
        const minEmi = isGold ? new Decimal(0) : l.emiAmount;
        return {
          loanId: l.id,
          name: l.name || l.lender,
          placeOrPurpose: l.placeOrPurpose,
          lender: l.lender,
          type: l.type,
          currentPrincipal: l.principal.toFixed(2),
          interestRate: l.interestRate.toFixed(2),
          minimumEmi: minEmi.toFixed(2),
          extraAmount: extra.toFixed(2),
          totalMonthlyPayment: minEmi.plus(extra).toFixed(2),
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
  ): { monthsToDebtFree: number; totalInterestPaid: Decimal; timeline: any[]; loanInterestPaid: Map<string, Decimal> } {
    const balances = new Map<string, Decimal>();
    const monthlyRates = new Map<string, Decimal>();
    const originalEmis = new Map<string, Decimal>();
    const payoffMonths = new Map<string, number>();
    const loanInterestPaid = new Map<string, Decimal>();

    for (const l of loans) {
      balances.set(l.id, new Decimal(l.principal));
      monthlyRates.set(l.id, l.interestRate.dividedBy(1200));
      originalEmis.set(l.id, new Decimal(l.emiAmount));
      loanInterestPaid.set(l.id, new Decimal(0));
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
        loanInterestPaid.set(loan.id, (loanInterestPaid.get(loan.id) || new Decimal(0)).plus(interest));

        const isGold = loan.type === 'jewel' || loan.type === 'gold';
        const extraPayment = extraAllocs[loan.id] || new Decimal(0);

        if (isGold) {
          // Gold loan: no regular EMI is paid in baseline, monthly interest capitalizes into balance
          bal = bal.plus(interest);
          const reachedBulletMaturity = month >= (loan.tenureMonths || 12);

          if (extraPayment.greaterThanOrEqualTo(bal) || reachedBulletMaturity) {
            const unspentRemainder = reachedBulletMaturity
              ? Decimal.max(0, extraPayment.minus(bal))
              : extraPayment.minus(bal);
            balances.set(loan.id, new Decimal(0));
            if (!payoffMonths.has(loan.id)) {
              payoffMonths.set(loan.id, month);
            }
            if (unspentRemainder.greaterThan(0)) {
              const nextLoan = activeLoans.find(
                (other) => other.id !== loan.id && (balances.get(other.id) || new Decimal(0)).greaterThan(0),
              );
              if (nextLoan) {
                extraAllocs[nextLoan.id] = (extraAllocs[nextLoan.id] || new Decimal(0)).plus(unspentRemainder);
              }
            }
          } else {
            balances.set(loan.id, Decimal.max(0, bal.minus(extraPayment)));
          }
        } else {
          // Standard amortizing loan
          const regularEmi = originalEmis.get(loan.id)!;
          const totalPayment = regularEmi.plus(extraPayment);
          const principalReduction = totalPayment.minus(interest);

          if (principalReduction.greaterThanOrEqualTo(bal)) {
            const unspentRemainder = principalReduction.minus(bal);
            balances.set(loan.id, new Decimal(0));
            if (!payoffMonths.has(loan.id)) {
              payoffMonths.set(loan.id, month);
              if (prepaymentMode === 'recurring_monthly') {
                rollingSurplus = rollingSurplus.plus(regularEmi);
              }
            }
            if (unspentRemainder.greaterThan(0)) {
              const nextLoan = activeLoans.find(
                (other) => other.id !== loan.id && (balances.get(other.id) || new Decimal(0)).greaterThan(0),
              );
              if (nextLoan) {
                extraAllocs[nextLoan.id] = (extraAllocs[nextLoan.id] || new Decimal(0)).plus(unspentRemainder);
              }
            }
          } else {
            balances.set(loan.id, bal.minus(principalReduction));
          }
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
      loanInterestPaid,
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

