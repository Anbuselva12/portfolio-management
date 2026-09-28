import { Injectable, Inject } from '@nestjs/common';
import {
  I_ASSET_REPOSITORY,
  IAssetRepository,
  I_INCOME_REPOSITORY,
  IIncomeRepository,
  I_EXPENSE_REPOSITORY,
  IExpenseRepository,
  I_LOAN_REPOSITORY,
  ILoanRepository,
  I_REPAYMENT_SCHEDULE_REPOSITORY,
  IRepaymentScheduleRepository,
  I_FAMILY_REPOSITORY,
  IFamilyRepository,
  I_CURRENCY_RATE_REPOSITORY,
  ICurrencyRateRepository,
} from '../repositories/interfaces';
import Decimal from 'decimal.js';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(I_ASSET_REPOSITORY) private readonly assetRepository: IAssetRepository,
    @Inject(I_INCOME_REPOSITORY) private readonly incomeRepository: IIncomeRepository,
    @Inject(I_EXPENSE_REPOSITORY) private readonly expenseRepository: IExpenseRepository,
    @Inject(I_LOAN_REPOSITORY) private readonly loanRepository: ILoanRepository,
    @Inject(I_REPAYMENT_SCHEDULE_REPOSITORY) private readonly scheduleRepository: IRepaymentScheduleRepository,
    @Inject(I_FAMILY_REPOSITORY) private readonly familyRepository: IFamilyRepository,
    @Inject(I_CURRENCY_RATE_REPOSITORY) private readonly currencyRateRepository: ICurrencyRateRepository,
  ) {}

  private convert(amount: Decimal, fromCurrency: string, baseCurrency: string, ratesMap: Map<string, Decimal>): Decimal {
    if (!fromCurrency || fromCurrency === baseCurrency) return amount;
    const key = `${fromCurrency.toUpperCase()}_${baseCurrency.toUpperCase()}`;
    const rate =
      ratesMap.get(key) ||
      (fromCurrency === 'USD' && baseCurrency === 'INR'
        ? new Decimal(83.5)
        : fromCurrency === 'EUR' && baseCurrency === 'INR'
        ? new Decimal(90.5)
        : new Decimal(1));
    return amount.times(rate);
  }

  async getSummary(familyId: string, memberId: string | null) {
    const family = await this.familyRepository.findById(familyId);
    const baseCurrency = family?.base_currency || 'INR';

    const [assets, incomes, loans, rates] = await Promise.all([
      memberId ? this.assetRepository.findByMemberId(memberId) : this.assetRepository.findByFamilyId(familyId),
      memberId ? this.incomeRepository.findByMemberId(memberId) : this.incomeRepository.findByFamilyId(familyId),
      memberId ? this.loanRepository.findByMemberId(memberId) : this.loanRepository.findByFamilyId(familyId),
      this.currencyRateRepository.findByFamilyId(familyId),
    ]);

    const ratesMap = new Map<string, Decimal>();
    for (const r of rates) {
      ratesMap.set(`${r.from_currency.toUpperCase()}_${r.to_currency.toUpperCase()}`, new Decimal(r.rate.toString()));
    }

    const activeLoans = loans.filter((l) => l.status === 'active');

    // Total liabilities converted to base currency
    const totalLiabilities = activeLoans.reduce((sum, l) => {
      const loanBalance = (l as any).current_outstanding_principal ?? l.principal;
      const conv = this.convert(new Decimal(loanBalance.toString()), l.currency, baseCurrency, ratesMap);
      return sum.plus(conv);
    }, new Decimal(0));

    // Monthly EMI converted to base currency
    const monthlyEmi = activeLoans.reduce((sum, l) => {
      const conv = this.convert(new Decimal(l.emi_amount.toString()), l.currency, baseCurrency, ratesMap);
      return sum.plus(conv);
    }, new Decimal(0));

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    // Last month dates
    const lastMonthDate = new Date(currentYear, currentMonth - 2, 1);
    const lastYear = lastMonthDate.getFullYear();
    const lastMonth = lastMonthDate.getMonth() + 1;

    const currentExpenses = await this.expenseRepository.findByMonth(familyId, currentYear, currentMonth);
    const lastMonthExpenses = await this.expenseRepository.findByMonth(familyId, lastYear, lastMonth);

    const filteredCurrentExpenses = memberId ? currentExpenses.filter((e) => e.member_id === memberId) : currentExpenses;
    const filteredLastMonthExpenses = memberId ? lastMonthExpenses.filter((e) => e.member_id === memberId) : lastMonthExpenses;

    // Total assets converted to base currency
    const totalAssets = assets.reduce((sum, a) => {
      const conv = this.convert(new Decimal(a.current_value.toString()), a.currency, baseCurrency, ratesMap);
      return sum.plus(conv);
    }, new Decimal(0));

    const netWorth = totalAssets.minus(totalLiabilities);

    const yearMonth = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
    const monthlyReceipts = await this.incomeRepository.findReceiptsByFamilyAndMonth(familyId, yearMonth);
    const receiptMap = new Map<string, any>();
    for (const r of monthlyReceipts) {
      receiptMap.set(r.income_id, r);
    }

    // Monthly income converted to base currency (using confirmed monthly receipt if available)
    const currentMonthIncome = incomes.reduce((sum, i) => {
      if (i.status !== 'active') return sum;
      const receipt = receiptMap.get(i.id);
      const effectiveAmount = receipt && receipt.status === 'received' ? receipt.received_amount : i.amount;
      const conv = this.convert(new Decimal(effectiveAmount.toString()), i.currency, baseCurrency, ratesMap);
      if (i.recurrence === 'recurring_monthly') return sum.plus(conv);
      if (i.recurrence === 'one_off') {
        const sDate = new Date(i.start_date);
        if (sDate.getFullYear() === currentYear && sDate.getMonth() + 1 === currentMonth) {
          return sum.plus(conv);
        }
      }
      return sum;
    }, new Decimal(0));

    const monthlyExpenses = filteredCurrentExpenses
      .filter((e) => (e as any).source !== 'loan_emi_auto')
      .reduce((sum, e) => {
        const conv = this.convert(new Decimal(e.amount.toString()), e.currency, baseCurrency, ratesMap);
        return sum.plus(conv);
      }, new Decimal(0));

    // Net savings = Income - Expenses - EMI
    const monthlySavings = currentMonthIncome.minus(monthlyExpenses).minus(monthlyEmi);

    const savingsRatePct = currentMonthIncome.greaterThan(0)
      ? monthlySavings.dividedBy(currentMonthIncome).times(100).toDecimalPlaces(1, Decimal.ROUND_HALF_UP)
      : new Decimal(0);

    const debtToIncomeRatio = currentMonthIncome.greaterThan(0)
      ? monthlyEmi.dividedBy(currentMonthIncome).times(100).toDecimalPlaces(1, Decimal.ROUND_HALF_UP)
      : new Decimal(0);

    // Prior month metrics
    const lastMonthIncome = incomes.reduce((sum, i) => {
      if (i.status !== 'active') return sum;
      const conv = this.convert(new Decimal(i.amount.toString()), i.currency, baseCurrency, ratesMap);
      if (i.recurrence === 'recurring_monthly') return sum.plus(conv);
      if (i.recurrence === 'one_off') {
        if (i.start_date.getFullYear() === lastYear && i.start_date.getMonth() + 1 === lastMonth) {
          return sum.plus(conv);
        }
      }
      return sum;
    }, new Decimal(0));

    const lastMonthExpensesTotal = filteredLastMonthExpenses
      .filter((e) => (e as any).source !== 'loan_emi_auto')
      .reduce((sum, e) => {
        const conv = this.convert(new Decimal(e.amount.toString()), e.currency, baseCurrency, ratesMap);
        return sum.plus(conv);
      }, new Decimal(0));

    const lastMonthSavings = lastMonthIncome.minus(lastMonthExpensesTotal).minus(monthlyEmi);
    const lastMonthSavingsRate = lastMonthIncome.greaterThan(0)
      ? lastMonthSavings.dividedBy(lastMonthIncome).times(100).toDecimalPlaces(1, Decimal.ROUND_HALF_UP)
      : new Decimal(0);

    const lastMonthNetWorth = netWorth.minus(monthlySavings);

    return {
      netWorth: netWorth.toFixed(2),
      totalAssets: totalAssets.toFixed(2),
      totalLiabilities: totalLiabilities.toFixed(2),
      monthlyIncome: currentMonthIncome.toFixed(2),
      monthlyExpenses: monthlyExpenses.toFixed(2),
      monthlyEmi: monthlyEmi.toFixed(2),
      monthlySavings: monthlySavings.toFixed(2),
      savingsRatePct: savingsRatePct.toString(),
      debtToIncomeRatio: debtToIncomeRatio.toString(),
      baseCurrency,
      lastMonth: {
        netWorth: lastMonthNetWorth.toFixed(2),
        totalAssets: totalAssets.toFixed(2),
        totalLiabilities: totalLiabilities.toFixed(2),
        monthlyIncome: lastMonthIncome.toFixed(2),
        monthlyExpenses: lastMonthExpensesTotal.toFixed(2),
        monthlyEmi: monthlyEmi.toFixed(2),
        monthlySavings: lastMonthSavings.toFixed(2),
        savingsRatePct: lastMonthSavingsRate.toString(),
      },
    };
  }

  async getAnalytics(familyId: string, memberId: string | null) {
    const family = await this.familyRepository.findById(familyId);
    const baseCurrency = family?.base_currency || 'INR';

    const [assets, incomes, loans, rates] = await Promise.all([
      memberId ? this.assetRepository.findByMemberId(memberId) : this.assetRepository.findByFamilyId(familyId),
      memberId ? this.incomeRepository.findByMemberId(memberId) : this.incomeRepository.findByFamilyId(familyId),
      memberId ? this.loanRepository.findByMemberId(memberId) : this.loanRepository.findByFamilyId(familyId),
      this.currencyRateRepository.findByFamilyId(familyId),
    ]);

    const ratesMap = new Map<string, Decimal>();
    for (const r of rates) {
      ratesMap.set(`${r.from_currency.toUpperCase()}_${r.to_currency.toUpperCase()}`, new Decimal(r.rate.toString()));
    }

    const activeLoans = loans.filter((l) => l.status === 'active');

    // 1. Asset Allocation by type (converted to base currency)
    const assetMap = new Map<string, Decimal>();
    for (const a of assets) {
      const cur = assetMap.get(a.type) || new Decimal(0);
      const conv = this.convert(new Decimal(a.current_value.toString()), a.currency, baseCurrency, ratesMap);
      assetMap.set(a.type, cur.plus(conv));
    }
    const assetAllocation = Array.from(assetMap.entries()).map(([type, val]) => ({
      type,
      value: val.toNumber(),
    }));

    // 2. Liability Breakdown by type (converted to base currency)
    const liabilityMap = new Map<string, Decimal>();
    for (const l of activeLoans) {
      const cur = liabilityMap.get(l.type) || new Decimal(0);
      const loanBalance = (l as any).current_outstanding_principal ?? l.principal;
      const conv = this.convert(new Decimal(loanBalance.toString()), l.currency, baseCurrency, ratesMap);
      liabilityMap.set(l.type, cur.plus(conv));
    }
    const liabilityBreakdown = Array.from(liabilityMap.entries()).map(([type, val]) => ({
      type,
      value: val.toNumber(),
    }));

    // 3. Trailing 12-month net worth & cash flow trends
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    const netWorthTrend: any[] = [];
    const cashFlowTrend: any[] = [];

    const totalAssetVal = assets
      .reduce((s, a) => s.plus(this.convert(new Decimal(a.current_value.toString()), a.currency, baseCurrency, ratesMap)), new Decimal(0))
      .toNumber();
    const totalLiabVal = activeLoans
      .reduce((s, l) => {
        const loanBalance = (l as any).current_outstanding_principal ?? l.principal;
        return s.plus(this.convert(new Decimal(loanBalance.toString()), l.currency, baseCurrency, ratesMap));
      }, new Decimal(0))
      .toNumber();
    const totalEmiVal = activeLoans
      .reduce((s, l) => s.plus(this.convert(new Decimal(l.emi_amount.toString()), l.currency, baseCurrency, ratesMap)), new Decimal(0))
      .toNumber();
    const totalIncomeVal = incomes
      .filter((i) => i.status === 'active' && i.recurrence === 'recurring_monthly')
      .reduce((s, i) => s.plus(this.convert(new Decimal(i.amount.toString()), i.currency, baseCurrency, ratesMap)), new Decimal(0))
      .toNumber();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;

      const liabSim = Math.max(0, totalLiabVal - (11 - i) * (totalEmiVal * 0.6));
      const assetSim = totalAssetVal * (1 - (11 - i) * 0.015);
      const nwSim = assetSim - liabSim;

      netWorthTrend.push({
        month: label,
        netWorth: Math.round(nwSim),
        assets: Math.round(assetSim),
        liabilities: Math.round(liabSim),
      });

      cashFlowTrend.push({
        month: label,
        income: Math.round(totalIncomeVal),
        expenses: Math.round(totalIncomeVal * 0.4),
        emi: Math.round(totalEmiVal),
      });
    }

    // 4. Payoff Timeline
    const payoffTimeline = activeLoans.map((l) => {
      const startDate = new Date(l.start_date);
      const payoffDate = new Date(startDate);
      payoffDate.setMonth(payoffDate.getMonth() + l.tenure_months);
      const loanBalance = (l as any).current_outstanding_principal ?? l.principal;

      return {
        id: l.id,
        lender: l.lender,
        type: l.type,
        principal: Number(loanBalance),
        emi: Number(l.emi_amount),
        startDate: startDate.toISOString().split('T')[0],
        payoffDate: payoffDate.toISOString().split('T')[0],
        tenureMonths: l.tenure_months,
      };
    });

    return {
      assetAllocation,
      liabilityBreakdown,
      netWorthTrend,
      cashFlowTrend,
      payoffTimeline,
    };
  }

  async getReminders(familyId: string, memberId: string | null) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth() + 1;
    const yearMonth = `${currentYear}-${currentMonthNum.toString().padStart(2, '0')}`;

    // 1. Fetch recurring incomes
    const incomes = memberId
      ? await this.incomeRepository.findByMemberId(memberId)
      : await this.incomeRepository.findByFamilyId(familyId);

    const activeRecurringIncomes = incomes.filter(
      (i) => i.status === 'active' && i.recurrence === 'recurring_monthly' && (i as any).reminders_enabled !== false,
    );

    const receipts = await this.incomeRepository.findReceiptsByFamilyAndMonth(familyId, yearMonth);
    const receiptsMap = new Map<string, any>();
    for (const r of receipts) {
      receiptsMap.set(r.income_id, r);
    }

    const incomeReminders = activeRecurringIncomes.map((inc) => {
      const rec = receiptsMap.get(inc.id);
      const isConfirmed = !!rec && rec.status === 'received';
      const scheduledAmt = inc.amount.toString();
      const actualAmt = isConfirmed ? rec.received_amount.toString() : scheduledAmt;
      const dueDay = (inc as any).due_day_of_month || new Date(inc.start_date).getDate();

      return {
        id: inc.id,
        receiptId: rec?.id || null,
        type: inc.type,
        label: inc.label,
        currency: inc.currency,
        scheduledAmount: scheduledAmt,
        actualAmount: actualAmt,
        isConfirmed,
        dueDay,
        yearMonth,
        notes: rec?.notes || null,
        receivedDate: rec?.received_date || null,
      };
    });

    // 2. Fetch loan EMIs for current month
    const loans = memberId
      ? await this.loanRepository.findByMemberId(memberId)
      : await this.loanRepository.findByFamilyId(familyId);

    const activeLoans = loans.filter(
      (l) => l.status === 'active' && (l as any).emi_reminders_enabled !== false && l.type !== 'jewel' && l.type !== 'gold',
    );

    const loanEmiReminders: any[] = [];
    for (const loan of activeLoans) {
      const schedule = await this.scheduleRepository.findByLoanId(loan.id);
      // Find installment for current month
      const currentInst = schedule.find((inst) => {
        const d = new Date(inst.due_date);
        return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonthNum;
      }) || schedule.find((inst) => !inst.is_paid);

      if (currentInst) {
        loanEmiReminders.push({
          id: loan.id,
          installmentId: currentInst.id,
          name: (loan as any).name || loan.lender,
          placeOrPurpose: (loan as any).place_or_purpose,
          lender: loan.lender,
          loanType: loan.type,
          emiAmount: currentInst.emi_amount.toString(),
          dueDate: currentInst.due_date,
          dueDay: new Date(currentInst.due_date).getDate(),
          isPaid: currentInst.is_paid,
          principalComponent: currentInst.principal_component.toString(),
          interestComponent: currentInst.interest_component.toString(),
        });
      }
    }

    const pendingIncomesCount = incomeReminders.filter((i) => !i.isConfirmed).length;
    const pendingLoansCount = loanEmiReminders.filter((l) => !l.isPaid).length;

    return {
      yearMonth,
      monthName: today.toLocaleString('default', { month: 'long', year: 'numeric' }),
      totalPendingCount: pendingIncomesCount + pendingLoansCount,
      incomes: incomeReminders,
      loans: loanEmiReminders,
    };
  }
}
