import Decimal from 'decimal.js';

// Configure Decimal precision for financial compliance (AGENTS.md)
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export interface ReconciliationResult {
  effectiveEmi: Decimal;
  calculatedEmi: Decimal;
  userEmi: Decimal | null;
  diffPct: number;
  hasDiscrepancy: boolean;
  impliedRatePct: Decimal | null;
}

export interface GeneratedInstallment {
  installment_number: number;
  due_date: Date;
  opening_balance: Decimal;
  emi_amount: Decimal;
  principal_component: Decimal;
  interest_component: Decimal;
  closing_balance: Decimal;
  is_paid: boolean;
  is_manually_edited: boolean;
}

export interface PrepaymentCalculation {
  extraAmount: Decimal;
  mode: 'reduce_tenure' | 'reduce_emi';
  penaltyAmount: Decimal;
  accruedInterest: Decimal;
  totalPaid: Decimal;
  interestSaved: Decimal;
  netBenefit: Decimal;
  newPayoffDate: Date;
  previousPayoffDate: Date;
  newEmi: Decimal;
  previousEmi: Decimal;
  tenureReducedMonths: number;
}

export interface RateRevisionCalculation {
  oldRate: Decimal;
  newRate: Decimal;
  policy: 'keep_emi' | 'keep_tenure';
  oldTenureMonths: number;
  newTenureMonths: number;
  oldEmi: Decimal;
  newEmi: Decimal;
  tenureDiffMonths: number;
  interestSaved: Decimal;
  newPayoffDate: Date;
  previousPayoffDate: Date;
}

export class LoanEngine {
  /**
   * Reducing-balance compound interest monthly EMI calculation.
   * Formula: EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
   */
  static calculateReducingEmi(principal: Decimal, annualRatePct: Decimal, tenureMonths: number): Decimal {
    if (principal.isZero() || tenureMonths <= 0) return new Decimal(0);
    if (annualRatePct.isZero()) return principal.dividedBy(tenureMonths).toDecimalPlaces(2);

    const r = annualRatePct.dividedBy(12).dividedBy(100);
    const n = new Decimal(tenureMonths);
    const onePlusR = new Decimal(1).plus(r);
    const onePlusRPowN = onePlusR.pow(n.toNumber());

    const numerator = principal.times(r).times(onePlusRPowN);
    const denominator = onePlusRPowN.minus(1);

    return numerator.dividedBy(denominator).toDecimalPlaces(2);
  }

  /**
   * Simple flat-interest monthly EMI calculation.
   * Formula: Total Interest = P * (R / 100) * (T / 12)
   * EMI = (P + Total Interest) / n
   */
  static calculateFlatSimpleEmi(principal: Decimal, annualRatePct: Decimal, tenureMonths: number): Decimal {
    if (principal.isZero() || tenureMonths <= 0) return new Decimal(0);
    const totalInterest = principal.times(annualRatePct.dividedBy(100)).times(new Decimal(tenureMonths).dividedBy(12));
    const totalPayable = principal.plus(totalInterest);
    return totalPayable.dividedBy(tenureMonths).toDecimalPlaces(2);
  }

  /**
   * Newton-Raphson solver to find the true implied annual interest rate
   * when user-provided EMI differs from calculated EMI.
   * f(r) = P * r * (1+r)^n - EMI * ((1+r)^n - 1) = 0
   */
  static solveImpliedAnnualRate(
    principal: Decimal,
    userEmi: Decimal,
    tenureMonths: number,
    initialGuessPct: Decimal = new Decimal(10),
    tolerance: Decimal = new Decimal('1e-7'),
    maxIterations: number = 100,
  ): Decimal {
    let r = initialGuessPct.dividedBy(12).dividedBy(100); // monthly rate guess
    const n = tenureMonths;
    const P = principal;
    const E = userEmi;

    for (let i = 0; i < maxIterations; i++) {
      const onePlusR = new Decimal(1).plus(r);
      const powN = onePlusR.pow(n);
      const powNMinus1 = onePlusR.pow(n - 1);

      // f(r) = P * r * (1+r)^n - E * ((1+r)^n - 1)
      const f = P.times(r).times(powN).minus(E.times(powN.minus(1)));

      // f'(r) = P * (1+r)^n + P * n * r * (1+r)^(n-1) - E * n * (1+r)^(n-1)
      const df = P.times(powN)
        .plus(P.times(n).times(r).times(powNMinus1))
        .minus(E.times(n).times(powNMinus1));

      if (df.isZero()) break;

      const diff = f.dividedBy(df);
      r = r.minus(diff);

      if (diff.abs().lessThan(tolerance)) {
        break;
      }
    }

    // Convert monthly rate back to annual percentage
    return r.times(12).times(100).toDecimalPlaces(4);
  }

  /**
   * Reconciles user-input EMI vs calculated EMI per SDD §7.3.
   * Default tolerance is 1% (0.01).
   */
  static reconcileEmi(
    principal: Decimal,
    annualRatePct: Decimal,
    tenureMonths: number,
    userEmi?: Decimal | null,
    tolerancePct: number = 1.0,
  ): ReconciliationResult {
    const calculatedEmi = this.calculateReducingEmi(principal, annualRatePct, tenureMonths);

    if (!userEmi || userEmi.isZero()) {
      return {
        effectiveEmi: calculatedEmi,
        calculatedEmi,
        userEmi: null,
        diffPct: 0,
        hasDiscrepancy: false,
        impliedRatePct: null,
      };
    }

    const diff = userEmi.minus(calculatedEmi).abs();
    const diffPct = diff.dividedBy(calculatedEmi).times(100).toNumber();

    if (diffPct <= tolerancePct) {
      // Within tolerance: accept user's EMI as authoritative without discrepancy
      return {
        effectiveEmi: userEmi.toDecimalPlaces(2),
        calculatedEmi,
        userEmi: userEmi.toDecimalPlaces(2),
        diffPct,
        hasDiscrepancy: false,
        impliedRatePct: null,
      };
    }

    // Outside tolerance: calculate implied rate via Newton-Raphson
    const impliedRatePct = this.solveImpliedAnnualRate(principal, userEmi, tenureMonths, annualRatePct);

    return {
      effectiveEmi: userEmi.toDecimalPlaces(2),
      calculatedEmi,
      userEmi: userEmi.toDecimalPlaces(2),
      diffPct: Number(diffPct.toFixed(2)),
      hasDiscrepancy: true,
      impliedRatePct,
    };
  }

  /**
   * Generates a complete amortization schedule installment-by-installment.
   */
  static generateAmortizationSchedule(
    principal: Decimal,
    annualRatePct: Decimal,
    tenureMonths: number,
    startDate: Date,
    effectiveEmi: Decimal,
    interestType: string = 'reducing_compound',
  ): GeneratedInstallment[] {
    const schedule: GeneratedInstallment[] = [];
    let currentOpening = new Decimal(principal);
    const monthlyRate = annualRatePct.dividedBy(12).dividedBy(100);
    const isFlat = interestType === 'flat_simple';
    const flatMonthlyInterest = isFlat
      ? principal.times(annualRatePct.dividedBy(100)).times(new Decimal(tenureMonths).dividedBy(12)).dividedBy(tenureMonths)
      : new Decimal(0);

    for (let i = 1; i <= tenureMonths; i++) {
      if (currentOpening.lessThanOrEqualTo(0)) break;

      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));

      let interestComponent: Decimal;
      if (isFlat) {
        interestComponent = flatMonthlyInterest;
      } else {
        interestComponent = currentOpening.times(monthlyRate).toDecimalPlaces(2);
      }

      let emiAmount = effectiveEmi;
      let principalComponent = emiAmount.minus(interestComponent);

      // On final installment or if balance drops below EMI, cap principal to clear balance to exactly 0
      if (principalComponent.greaterThanOrEqualTo(currentOpening) || i === tenureMonths) {
        principalComponent = currentOpening;
        emiAmount = principalComponent.plus(interestComponent);
      }

      const closingBalance = currentOpening.minus(principalComponent).toDecimalPlaces(2);

      schedule.push({
        installment_number: i,
        due_date: dueDate,
        opening_balance: currentOpening.toDecimalPlaces(2),
        emi_amount: emiAmount.toDecimalPlaces(2),
        principal_component: principalComponent.toDecimalPlaces(2),
        interest_component: interestComponent.toDecimalPlaces(2),
        closing_balance: closingBalance.lessThan(0.01) ? new Decimal(0) : closingBalance,
        is_paid: false,
        is_manually_edited: false,
      });

      currentOpening = closingBalance;
      if (currentOpening.lessThanOrEqualTo(0)) break;
    }

    return schedule;
  }

  /**
   * Calculates the what-if impact of a prepayment.
   * Option A (Reduce Tenure): Keep EMI, calculate n' = -ln(1 - (r * (P - X)) / EMI) / ln(1 + r)
    * Option B (Reduce EMI): Keep tenure, calculate new EMI = (P - X) * r * (1+r)^n / ((1+r)^n - 1)
   */
  static calculatePrepaymentImpact(
    currentOutstanding: Decimal,
    annualRatePct: Decimal,
    currentEmi: Decimal,
    remainingTenureMonths: number,
    extraAmount: Decimal,
    mode: 'reduce_tenure' | 'reduce_emi',
    prepaymentDate: Date,
    currentPayoffDate: Date,
    penaltyType: string = 'none',
    penaltyValue?: Decimal | null,
    accruedInterest: Decimal = new Decimal(0),
  ): PrepaymentCalculation {
    const netOutstanding = currentOutstanding.minus(extraAmount);
    if (netOutstanding.lessThanOrEqualTo(0)) {
      return {
        extraAmount,
        mode,
        penaltyAmount: new Decimal(0),
        accruedInterest,
        totalPaid: extraAmount.plus(accruedInterest),
        interestSaved: new Decimal(0),
        netBenefit: new Decimal(0).minus(accruedInterest),
        newPayoffDate: prepaymentDate,
        previousPayoffDate: currentPayoffDate,
        newEmi: new Decimal(0),
        previousEmi: currentEmi,
        tenureReducedMonths: remainingTenureMonths,
      };
    }

    // Calculate prepayment penalty
    let penaltyAmount = new Decimal(0);
    if (penaltyType === 'percentage_of_prepayment' && penaltyValue) {
      penaltyAmount = extraAmount.times(penaltyValue.dividedBy(100)).toDecimalPlaces(2);
    } else if (penaltyType === 'fixed_amount' && penaltyValue) {
      penaltyAmount = penaltyValue.toDecimalPlaces(2);
    }

    const r = annualRatePct.dividedBy(12).dividedBy(100);

    // Baseline total interest remaining without prepayment
    const baselineTotalPayable = currentEmi.times(remainingTenureMonths);
    const baselineRemainingInterest = baselineTotalPayable.minus(currentOutstanding);

    let newEmi = currentEmi;
    let newTenureMonths = remainingTenureMonths;
    let newPayoffDate = new Date(currentPayoffDate);

    if (mode === 'reduce_tenure') {
      // Keep EMI fixed: n' = -ln(1 - (r * (P - X)) / EMI) / ln(1 + r)
      const numeratorInner = new Decimal(1).minus(r.times(netOutstanding).dividedBy(currentEmi));
      if (numeratorInner.greaterThan(0)) {
        const lnNumerator = Decimal.ln(numeratorInner);
        const lnDenominator = Decimal.ln(new Decimal(1).plus(r));
        newTenureMonths = Math.ceil(lnNumerator.negated().dividedBy(lnDenominator).toNumber());
      } else {
        newTenureMonths = 1;
      }

      newPayoffDate = new Date(prepaymentDate);
      newPayoffDate.setMonth(newPayoffDate.getMonth() + newTenureMonths);
    } else {
      // Reduce EMI: Keep tenure fixed
      newEmi = this.calculateReducingEmi(netOutstanding, annualRatePct, remainingTenureMonths);
    }

    const newTotalPayable = mode === 'reduce_tenure'
      ? currentEmi.times(newTenureMonths)
      : newEmi.times(remainingTenureMonths);

    const newRemainingInterest = newTotalPayable.minus(netOutstanding);
    const interestSaved = Decimal.max(0, baselineRemainingInterest.minus(newRemainingInterest)).toDecimalPlaces(2);
    const totalPaid = extraAmount.plus(penaltyAmount).plus(accruedInterest).toDecimalPlaces(2);
    const netBenefit = interestSaved.minus(penaltyAmount).minus(accruedInterest).toDecimalPlaces(2);
    const tenureReducedMonths = Math.max(0, remainingTenureMonths - newTenureMonths);

    return {
      extraAmount,
      mode,
      penaltyAmount,
      accruedInterest,
      totalPaid,
      interestSaved,
      netBenefit,
      newPayoffDate,
      previousPayoffDate: currentPayoffDate,
      newEmi: newEmi.toDecimalPlaces(2),
      previousEmi: currentEmi.toDecimalPlaces(2),
      tenureReducedMonths,
    };
  }

  /**
   * Calculates broken-period / accrued simple interest between previous EMI date and part-payment date.
   * Simple Interest = P * (R / 100) * (days / 365)
   */
  static calculateBrokenPeriodInterest(principal: Decimal, annualRatePct: Decimal, days: number): Decimal {
    if (principal.isZero() || annualRatePct.isZero() || days <= 0) return new Decimal(0);
    const rateDecimal = annualRatePct.dividedBy(100);
    const timeInYears = new Decimal(days).dividedBy(365);
    return principal.times(rateDecimal).times(timeInYears).toDecimalPlaces(2);
  }

  /**
   * Calculates the impact of a floating rate revision (Repo Rate hike / cut).
   * Policy A ('keep_emi'): Keeps monthly EMI fixed, re-amortizes remaining tenure months.
   * Policy B ('keep_tenure'): Keeps remaining tenure fixed, recalculates monthly EMI.
   */
  static calculateRateRevisionImpact(
    currentOutstanding: Decimal,
    oldRatePct: Decimal,
    newRatePct: Decimal,
    currentEmi: Decimal,
    remainingTenureMonths: number,
    policy: 'keep_emi' | 'keep_tenure',
    effectiveDate: Date,
    currentPayoffDate: Date,
  ): RateRevisionCalculation {
    const rOld = oldRatePct.dividedBy(12).dividedBy(100);
    const rNew = newRatePct.dividedBy(12).dividedBy(100);

    const oldTotalPayable = currentEmi.times(remainingTenureMonths);
    const oldRemainingInterest = oldTotalPayable.minus(currentOutstanding);

    let newEmi = currentEmi;
    let newTenureMonths = remainingTenureMonths;
    let newPayoffDate = new Date(currentPayoffDate);

    if (policy === 'keep_emi') {
      // Check if EMI covers monthly interest
      const monthlyInterestNew = currentOutstanding.times(rNew);
      if (currentEmi.lessThanOrEqualTo(monthlyInterestNew)) {
        throw new Error('EMI is too low to cover monthly interest at the new rate. Please increase EMI.');
      }

      // n' = -ln(1 - (r * P) / EMI) / ln(1 + r)
      const numeratorInner = new Decimal(1).minus(rNew.times(currentOutstanding).dividedBy(currentEmi));
      if (numeratorInner.greaterThan(0)) {
        const lnNumerator = Decimal.ln(numeratorInner);
        const lnDenominator = Decimal.ln(new Decimal(1).plus(rNew));
        newTenureMonths = Math.ceil(lnNumerator.negated().dividedBy(lnDenominator).toNumber());
      } else {
        newTenureMonths = 1;
      }

      newPayoffDate = new Date(effectiveDate);
      newPayoffDate.setMonth(newPayoffDate.getMonth() + newTenureMonths);
    } else {
      // keep_tenure: Recalculate EMI
      newEmi = this.calculateReducingEmi(currentOutstanding, newRatePct, remainingTenureMonths);
      newTenureMonths = remainingTenureMonths;
      newPayoffDate = new Date(currentPayoffDate);
    }

    const newTotalPayable = policy === 'keep_emi'
      ? currentEmi.times(newTenureMonths)
      : newEmi.times(newTenureMonths);

    const newRemainingInterest = newTotalPayable.minus(currentOutstanding);
    const interestSaved = oldRemainingInterest.minus(newRemainingInterest).toDecimalPlaces(2);
    const tenureDiffMonths = remainingTenureMonths - newTenureMonths;

    return {
      oldRate: oldRatePct,
      newRate: newRatePct,
      policy,
      oldTenureMonths: remainingTenureMonths,
      newTenureMonths,
      oldEmi: currentEmi.toDecimalPlaces(2),
      newEmi: newEmi.toDecimalPlaces(2),
      tenureDiffMonths,
      interestSaved,
      newPayoffDate,
      previousPayoffDate: currentPayoffDate,
    };
  }
}

