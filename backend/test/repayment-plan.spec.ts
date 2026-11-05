import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { LoanEngine, RepaymentPlanError, RepaymentPlanInput } from '../src/loans/engine/loan-engine';

const P = new Decimal(1_000_000);
const RATE = new Decimal(9);
const MONTHS = 120;
const START = new Date('2026-12-05');

const currentEmi = LoanEngine.calculateReducingEmi(P, RATE, MONTHS);
const currentSchedule = LoanEngine.generateAmortizationSchedule(P, RATE, MONTHS, START, currentEmi);
const currentInterest = currentSchedule.reduce((sum, i) => sum.plus(i.interest_component), new Decimal(0));

const plan = (target: RepaymentPlanInput['target'], overrides: Partial<RepaymentPlanInput> = {}) =>
  LoanEngine.calculateRepaymentPlanChange({
    outstanding: P,
    annualRatePct: RATE,
    currentEmi,
    remainingTenureMonths: MONTHS,
    remainingInterest: currentInterest,
    firstDueDate: START,
    previousPayoffDate: currentSchedule[currentSchedule.length - 1].due_date,
    target,
    ...overrides,
  });

describe('Repayment plan change (set EMI / set tenure)', () => {
  it('a higher EMI shortens the tenure and saves interest', () => {
    const result = plan({ mode: 'set_emi', newEmi: new Decimal(15000) });
    expect(result.newTenureMonths).toBeLessThan(MONTHS);
    expect(result.tenureDiffMonths).toBe(MONTHS - result.newTenureMonths);
    expect(result.emiDiff.toNumber()).toBeCloseTo(15000 - currentEmi.toNumber(), 2);
    expect(result.interestSaved.greaterThan(0)).toBe(true);
    expect(result.newPayoffDate.getTime()).toBeLessThan(result.previousPayoffDate.getTime());
  });

  it('a lower EMI extends the tenure and costs more interest', () => {
    const result = plan({ mode: 'set_emi', newEmi: new Decimal(10000) });
    expect(result.newTenureMonths).toBeGreaterThan(MONTHS);
    expect(result.interestSaved.lessThan(0)).toBe(true);
  });

  it('a shorter tenure needs a higher EMI; a longer one a lower EMI', () => {
    const shorter = plan({ mode: 'set_tenure', newTenureMonths: 84 });
    const longer = plan({ mode: 'set_tenure', newTenureMonths: 180 });
    expect(shorter.newTenureMonths).toBe(84);
    expect(shorter.newEmi.greaterThan(currentEmi)).toBe(true);
    expect(shorter.interestSaved.greaterThan(0)).toBe(true);
    expect(longer.newEmi.lessThan(currentEmi)).toBe(true);
    expect(longer.interestSaved.lessThan(0)).toBe(true);
  });

  it('keeping the same EMI keeps the same tenure and interest', () => {
    const result = plan({ mode: 'set_emi', newEmi: currentEmi });
    expect(result.newTenureMonths).toBe(MONTHS);
    expect(Math.abs(result.interestSaved.toNumber())).toBeLessThan(5);
  });

  it('the EMI for a tenure maps back to that tenure (no extra rounding month)', () => {
    for (const months of [24, 60, 84, 120, 240]) {
      const emi = plan({ mode: 'set_tenure', newTenureMonths: months }).newEmi;
      expect(plan({ mode: 'set_emi', newEmi: emi }).newTenureMonths).toBe(months);
    }
  });

  it('the new schedule clears the balance and its interest matches the reported total', () => {
    const result = plan({ mode: 'set_emi', newEmi: new Decimal(18000) });
    const schedule = LoanEngine.generateAmortizationSchedule(P, RATE, result.newTenureMonths, START, result.newEmi);
    expect(schedule.length).toBe(result.newTenureMonths);
    expect(schedule[schedule.length - 1].closing_balance.isZero()).toBe(true);
    const interest = schedule.reduce((sum, i) => sum.plus(i.interest_component), new Decimal(0));
    expect(interest.toDecimalPlaces(2).equals(result.newRemainingInterest)).toBe(true);
    expect(result.lastInstallmentAmount.lessThanOrEqualTo(result.newEmi.plus(result.newEmi.times('0.05')))).toBe(true);
  });

  it('rejects an EMI that does not cover the monthly interest', () => {
    // First month's interest is 1,000,000 x 0.75% = 7,500.
    expect(() => plan({ mode: 'set_emi', newEmi: new Decimal(7500) })).toThrow(RepaymentPlanError);
    expect(() => plan({ mode: 'set_emi', newEmi: new Decimal(7000) })).toThrow(/monthly interest/);
  });

  it('rejects a plan longer than 50 years', () => {
    expect(() => plan({ mode: 'set_emi', newEmi: new Decimal(7510) })).toThrow(RepaymentPlanError);
    expect(() => plan({ mode: 'set_tenure', newTenureMonths: 601 })).toThrow(/limit/);
  });

  it('handles a 0% loan', () => {
    const result = plan({ mode: 'set_emi', newEmi: new Decimal(25000) }, { annualRatePct: new Decimal(0), remainingInterest: new Decimal(0) });
    expect(result.newTenureMonths).toBe(40);
    expect(result.interestSaved.isZero()).toBe(true);
  });

  it('an EMI larger than the balance closes the loan in one installment', () => {
    const result = plan({ mode: 'set_emi', newEmi: new Decimal(2_000_000) });
    expect(result.newTenureMonths).toBe(1);
  });
});
