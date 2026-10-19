import Decimal from 'decimal.js';

/**
 * Pure funding & returns maths for a project (SDD §4.11, FR-93 … FR-96).
 * No I/O so it can be unit-tested against known values and reused by the hub summary and the detail tab.
 */

export interface LoanFundingInput {
  loanId: string;
  name: string;
  lender: string;
  type: string;
  status: string;
  /** Part of the loan used for this project. */
  allocated: Decimal;
  /** Original principal of the loan (denominator of the project's share). */
  basePrincipal: Decimal;
  outstanding: Decimal;
  emi: Decimal;
  /** Total interest paid on the whole loan so far. */
  interestPaid: Decimal;
}

export interface IncomeReceiptInput {
  /** `YYYY-MM` */
  yearMonth: string;
  amount: Decimal;
}

export interface IncomeFundingInput {
  id: string;
  label: string;
  type: string;
  recurrence: 'recurring_monthly' | 'one_off' | string;
  status: string;
  amount: Decimal;
  startDate: Date;
  endDate: Date | null;
  receipts: IncomeReceiptInput[];
}

export interface FundingReturnsInput {
  invested: Decimal;
  currentValue: Decimal | null;
  loans: LoanFundingInput[];
  incomes: IncomeFundingInput[];
  today: Date;
}

export interface FundingReturnsResult {
  invested: string;
  fundedByLoans: string;
  fundedByLoansPct: string | null;
  ownFunds: string;
  ownFundsPct: string | null;
  loansExceedInvested: boolean;
  loansExceedBy: string;
  loans: Array<{
    loanId: string;
    name: string;
    lender: string;
    type: string;
    status: string;
    allocated: string;
    sharePct: string;
    outstandingShare: string;
    emiShare: string;
    interestPaidShare: string;
  }>;
  loanTotals: { allocated: string; outstandingShare: string; emiShare: string; interestPaidShare: string };
  incomes: Array<{
    id: string;
    label: string;
    type: string;
    recurrence: string;
    status: string;
    monthlyAmount: string;
    receivedTotal: string;
  }>;
  monthlyIncome: string;
  totalIncomeReceived: string;
  monthlySeries: Array<{ month: string; amount: string }>;
  grossYieldPct: string | null;
  paybackYears: string | null;
  netMonthlyAfterEmi: string;
  incomeCoversEmiPct: string | null;
  currentValue: string | null;
  appreciation: string | null;
  totalReturn: string | null;
  totalReturnPct: string | null;
  yieldOnCurrentValuePct: string | null;
}

const MONTHS_PER_YEAR = new Decimal(12);
const HUNDRED = new Decimal(100);
const ZERO = new Decimal(0);

export const toYearMonth = (d: Date): string =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

const pct = (part: Decimal, whole: Decimal): Decimal | null =>
  whole.gt(0) ? part.dividedBy(whole).times(HUNDRED) : null;

const fmt = (d: Decimal | null, dp = 2): string | null => (d === null ? null : d.toFixed(dp));

/** Month keys from `from` to `to` inclusive (both `YYYY-MM`). */
const monthRange = (from: string, to: string): string[] => {
  const out: string[] = [];
  let [y, m] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
};

export function calculateFundingReturns(input: FundingReturnsInput): FundingReturnsResult {
  const { invested, currentValue, today } = input;

  // ── Loans (project's share of each loan) ──────────────────────────────────
  const loanRows = input.loans.map((l) => {
    const share = l.basePrincipal.gt(0) ? Decimal.min(new Decimal(1), l.allocated.dividedBy(l.basePrincipal)) : ZERO;
    const isOpen = l.status === 'active';
    return {
      raw: l,
      share,
      outstandingShare: isOpen ? l.outstanding.times(share) : ZERO,
      emiShare: isOpen ? l.emi.times(share) : ZERO,
      interestPaidShare: l.interestPaid.times(share),
    };
  });

  const fundedByLoans = input.loans.reduce((s, l) => s.plus(l.allocated), ZERO);
  const ownFunds = Decimal.max(invested.minus(fundedByLoans), ZERO);
  const loansExceedBy = Decimal.max(fundedByLoans.minus(invested), ZERO);
  const totalEmi = loanRows.reduce((s, r) => s.plus(r.emiShare), ZERO);

  // ── Income ────────────────────────────────────────────────────────────────
  const monthly = new Map<string, Decimal>();
  const addMonth = (key: string, amount: Decimal) => monthly.set(key, (monthly.get(key) ?? ZERO).plus(amount));
  let monthlyIncome = ZERO;
  let totalReceived = ZERO;

  const incomeRows = input.incomes.map((inc) => {
    let received = ZERO;
    if (inc.recurrence === 'one_off') {
      if (inc.startDate.getTime() <= today.getTime()) {
        received = inc.amount;
        addMonth(toYearMonth(inc.startDate), inc.amount);
      }
    } else {
      for (const r of inc.receipts) {
        received = received.plus(r.amount);
        addMonth(r.yearMonth, r.amount);
      }
      const isRunning =
        inc.status === 'active' &&
        inc.startDate.getTime() <= today.getTime() &&
        (inc.endDate === null || inc.endDate.getTime() >= today.getTime());
      if (isRunning) monthlyIncome = monthlyIncome.plus(inc.amount);
    }
    totalReceived = totalReceived.plus(received);
    return {
      id: inc.id,
      label: inc.label,
      type: inc.type,
      recurrence: inc.recurrence,
      status: inc.status,
      monthlyAmount: inc.recurrence === 'one_off' ? ZERO : inc.amount,
      receivedTotal: received,
    };
  });

  const keys = [...monthly.keys()].sort();
  const series = keys.length
    ? monthRange(keys[0], [keys[keys.length - 1], toYearMonth(today)].sort().pop() as string).map((k) => ({
        month: k,
        amount: (monthly.get(k) ?? ZERO).toFixed(2),
      }))
    : [];

  // ── Returns ───────────────────────────────────────────────────────────────
  const annualIncome = monthlyIncome.times(MONTHS_PER_YEAR);
  const grossYield = pct(annualIncome, invested);
  const payback = annualIncome.gt(0) && invested.gt(0) ? invested.dividedBy(annualIncome) : null;
  const appreciation = currentValue ? currentValue.minus(invested) : null;
  const totalReturn = appreciation ? totalReceived.plus(appreciation) : null;

  return {
    invested: invested.toFixed(2),
    fundedByLoans: fundedByLoans.toFixed(2),
    fundedByLoansPct: fmt(pct(fundedByLoans, invested)),
    ownFunds: ownFunds.toFixed(2),
    ownFundsPct: fmt(invested.gt(0) ? pct(ownFunds, invested) : null),
    loansExceedInvested: loansExceedBy.gt(0),
    loansExceedBy: loansExceedBy.toFixed(2),
    loans: loanRows.map((r) => ({
      loanId: r.raw.loanId,
      name: r.raw.name,
      lender: r.raw.lender,
      type: r.raw.type,
      status: r.raw.status,
      allocated: r.raw.allocated.toFixed(2),
      sharePct: r.share.times(HUNDRED).toFixed(2),
      outstandingShare: r.outstandingShare.toFixed(2),
      emiShare: r.emiShare.toFixed(2),
      interestPaidShare: r.interestPaidShare.toFixed(2),
    })),
    loanTotals: {
      allocated: fundedByLoans.toFixed(2),
      outstandingShare: loanRows.reduce((s, r) => s.plus(r.outstandingShare), ZERO).toFixed(2),
      emiShare: totalEmi.toFixed(2),
      interestPaidShare: loanRows.reduce((s, r) => s.plus(r.interestPaidShare), ZERO).toFixed(2),
    },
    incomes: incomeRows.map((r) => ({
      ...r,
      monthlyAmount: r.monthlyAmount.toFixed(2),
      receivedTotal: r.receivedTotal.toFixed(2),
    })),
    monthlyIncome: monthlyIncome.toFixed(2),
    totalIncomeReceived: totalReceived.toFixed(2),
    monthlySeries: series,
    grossYieldPct: fmt(grossYield),
    paybackYears: fmt(payback, 1),
    netMonthlyAfterEmi: monthlyIncome.minus(totalEmi).toFixed(2),
    incomeCoversEmiPct: fmt(pct(monthlyIncome, totalEmi)),
    currentValue: fmt(currentValue),
    appreciation: fmt(appreciation),
    totalReturn: fmt(totalReturn),
    totalReturnPct: fmt(totalReturn ? pct(totalReturn, invested) : null),
    yieldOnCurrentValuePct: fmt(currentValue ? pct(annualIncome, currentValue) : null),
  };
}
