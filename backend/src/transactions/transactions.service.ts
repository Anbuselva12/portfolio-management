import { Injectable, Inject } from '@nestjs/common';
import {
  I_INCOME_REPOSITORY,
  IIncomeRepository,
  I_EXPENSE_REPOSITORY,
  IExpenseRepository,
  I_EXPENSE_CATEGORY_REPOSITORY,
  IExpenseCategoryRepository,
  I_LOAN_REPOSITORY,
  ILoanRepository,
  I_REPAYMENT_SCHEDULE_REPOSITORY,
  IRepaymentScheduleRepository,
  I_PREPAYMENT_REPOSITORY,
  IPrepaymentRepository,
  I_MEMBER_REPOSITORY,
  IMemberRepository,
  I_FAMILY_REPOSITORY,
  IFamilyRepository,
  I_CURRENCY_RATE_REPOSITORY,
  ICurrencyRateRepository,
  I_TRACKER_REPOSITORY,
  ITrackerRepository,
} from '../repositories/interfaces';
import Decimal from 'decimal.js';

export interface TransactionItem {
  id: string;
  date: string;
  direction: 'inflow' | 'outflow';
  type:
    | 'income_one_off'
    | 'income_recurring'
    | 'expense_household'
    | 'expense_insurance'
    | 'loan_emi'
    | 'loan_prepayment'
    | 'gold_loan_payment';
  title: string;
  subtitle: string;
  amount: string;
  currency: string;
  convertedAmount: string;
  memberId: string;
  memberName: string;
  source: 'income' | 'expense' | 'loan';
  rawEntityId: string;
  /** Editable raw fields, so the Edit action can prefill the source record. */
  label: string | null;
  notes: string | null;
  /** Projects this row's source is tagged to (income stream project, or the loan's allocations). */
  projects: Array<{ id: string; name: string }>;
  /** Source entity edited by the "Tag project" action; null for rows that cannot be tagged. */
  tagTarget: { kind: 'income' | 'loan'; id: string } | null;
}

export interface TransactionsQueryDto {
  duration?: '1m' | '3m' | 'quarterly' | '1y' | 'yearly' | 'all';
  startDate?: string;
  endDate?: string;
  flow?: 'all' | 'inflow' | 'outflow';
  source?: 'all' | 'income' | 'expense' | 'loan';
  memberId?: string;
  /** `all` (default), `untagged`, or a project id. */
  projectId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(I_INCOME_REPOSITORY) private readonly incomeRepository: IIncomeRepository,
    @Inject(I_EXPENSE_REPOSITORY) private readonly expenseRepository: IExpenseRepository,
    @Inject(I_EXPENSE_CATEGORY_REPOSITORY) private readonly categoryRepository: IExpenseCategoryRepository,
    @Inject(I_LOAN_REPOSITORY) private readonly loanRepository: ILoanRepository,
    @Inject(I_REPAYMENT_SCHEDULE_REPOSITORY) private readonly scheduleRepository: IRepaymentScheduleRepository,
    @Inject(I_PREPAYMENT_REPOSITORY) private readonly prepaymentRepository: IPrepaymentRepository,
    @Inject(I_MEMBER_REPOSITORY) private readonly memberRepository: IMemberRepository,
    @Inject(I_FAMILY_REPOSITORY) private readonly familyRepository: IFamilyRepository,
    @Inject(I_CURRENCY_RATE_REPOSITORY) private readonly currencyRateRepository: ICurrencyRateRepository,
    @Inject(I_TRACKER_REPOSITORY) private readonly trackerRepository: ITrackerRepository,
  ) {}

  private convert(
    amount: Decimal,
    fromCurrency: string,
    baseCurrency: string,
    ratesMap: Map<string, Decimal>,
  ): Decimal {
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

  async getTransactions(familyId: string, query: TransactionsQueryDto) {
    const family = await this.familyRepository.findById(familyId);
    const baseCurrency = family?.base_currency || 'INR';

    const [members, categories, rates, incomes, expenses, loans, projects, allocations] = await Promise.all([
      this.memberRepository.findByFamilyId(familyId),
      this.categoryRepository.findByFamilyId(familyId),
      this.currencyRateRepository.findByFamilyId(familyId),
      this.incomeRepository.findByFamilyId(familyId),
      this.expenseRepository.findByFamilyId(familyId),
      this.loanRepository.findByFamilyId(familyId),
      this.trackerRepository.findProjectsByFamilyId(familyId),
      this.trackerRepository.findAllocationsByFamilyId(familyId),
    ]);

    const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
    const projectsForIncome = (projectId: string | null | undefined) =>
      projectId && projectNameById.has(projectId) ? [{ id: projectId, name: projectNameById.get(projectId)! }] : [];
    const projectsForLoan = (loanId: string) =>
      allocations
        .filter((a) => a.loan_id === loanId && projectNameById.has(a.project_id))
        .map((a) => ({ id: a.project_id, name: projectNameById.get(a.project_id)! }));

    const memberMap = new Map<string, string>();
    for (const m of members) {
      memberMap.set(m.id, m.display_name || m.username || 'Member');
    }

    const categoryMap = new Map<string, any>();
    for (const c of categories) {
      categoryMap.set(c.id, c);
    }

    const ratesMap = new Map<string, Decimal>();
    for (const r of rates) {
      ratesMap.set(
        `${r.from_currency.toUpperCase()}_${r.to_currency.toUpperCase()}`,
        new Decimal(r.rate.toString()),
      );
    }

    const allTx: TransactionItem[] = [];

    // 1. One-off incomes
    for (const inc of incomes) {
      if (inc.status === 'deleted' || (inc as any).deleted_at) continue;
      if (inc.recurrence === 'one_off') {
        const amt = new Decimal(inc.amount.toString());
        const conv = this.convert(amt, inc.currency, baseCurrency, ratesMap);
        allTx.push({
          id: `tx_inc_oneoff_${inc.id}`,
          date: new Date(inc.start_date).toISOString(),
          direction: 'inflow',
          type: 'income_one_off',
          title: inc.label || 'One-off Income',
          subtitle: `One-off Income (${inc.type})`,
          amount: amt.toFixed(2),
          currency: inc.currency,
          convertedAmount: conv.toFixed(2),
          memberId: inc.member_id,
          memberName: memberMap.get(inc.member_id) || 'Family Member',
          source: 'income',
          rawEntityId: inc.id,
          label: inc.label || null,
          notes: null,
          projects: projectsForIncome((inc as any).project_id),
          tagTarget: { kind: 'income', id: inc.id },
        });
      }
    }

    // 2. Confirmed Recurring Income Receipts
    const receipts = await this.incomeRepository.findAllReceiptsByFamily(familyId);
    const incomeMap = new Map<string, any>();
    for (const inc of incomes) {
      incomeMap.set(inc.id, inc);
    }

    for (const rec of receipts) {
      if (rec.status !== 'received') continue;
      const linkedIncome = incomeMap.get(rec.income_id);
      const incCurrency = linkedIncome?.currency || baseCurrency;
      const amt = new Decimal(rec.received_amount ? rec.received_amount.toString() : '0');
      const conv = this.convert(amt, incCurrency, baseCurrency, ratesMap);
      const dateVal = rec.received_date
        ? new Date(rec.received_date)
        : rec.year_month
        ? new Date(`${rec.year_month}-01`)
        : new Date(rec.created_at || Date.now());

      allTx.push({
        id: `tx_inc_rec_${rec.id}`,
        date: dateVal.toISOString(),
        direction: 'inflow',
        type: 'income_recurring',
        title: linkedIncome?.label || 'Recurring Income',
        subtitle: `Confirmed receipt (${rec.year_month})${rec.notes ? ' — ' + rec.notes : ''}`,
        amount: amt.toFixed(2),
        currency: incCurrency,
        convertedAmount: conv.toFixed(2),
        memberId: rec.member_id,
        memberName: memberMap.get(rec.member_id) || 'Family Member',
        source: 'income',
        rawEntityId: rec.id,
        label: null,
        notes: rec.notes || null,
        projects: projectsForIncome(linkedIncome?.project_id),
        tagTarget: linkedIncome ? { kind: 'income', id: linkedIncome.id } : null,
      });
    }

    // 3. Expenses (Exclude auto-queued loan EMIs to avoid duplication)
    for (const exp of expenses) {
      if (exp.deleted_at || (exp as any).source === 'loan_emi_auto') continue;
      // Also ensure is_paid is true if field is present
      if ((exp as any).is_paid === false) continue;

      const amt = new Decimal(exp.amount.toString());
      const conv = this.convert(amt, exp.currency || baseCurrency, baseCurrency, ratesMap);
      const cat = categoryMap.get(exp.category_id);
      const catName = cat ? cat.name : 'General';
      const isInsurance = exp.source === 'insurance_auto';

      allTx.push({
        id: `tx_exp_${exp.id}`,
        date: new Date(exp.date).toISOString(),
        direction: 'outflow',
        type: isInsurance ? 'expense_insurance' : 'expense_household',
        title: exp.notes ? `${catName}: ${exp.notes}` : catName,
        subtitle: isInsurance ? 'Insurance Premium' : `Household Expense (${catName})`,
        amount: amt.toFixed(2),
        currency: exp.currency || baseCurrency,
        convertedAmount: conv.toFixed(2),
        memberId: exp.member_id,
        memberName: memberMap.get(exp.member_id) || 'Family Member',
        source: 'expense',
        rawEntityId: exp.id,
        label: null,
        notes: exp.notes || null,
        projects: [],
        tagTarget: null,
      });
    }

    // 4. Loans: Paid EMIs and Prepayments
    for (const loan of loans) {
      if (loan.deleted_at) continue;
      const isGold = (loan.type as string) === 'gold' || (loan.type as string) === 'jewel';

      // 4a. Paid Installments
      const schedule = await this.scheduleRepository.findByLoanId(loan.id);
      for (const inst of schedule) {
        if (!inst.is_paid) continue;
        const amt = new Decimal(inst.emi_amount ? inst.emi_amount.toString() : '0');
        const conv = this.convert(amt, loan.currency || baseCurrency, baseCurrency, ratesMap);
        const dateVal = inst.paid_date ? new Date(inst.paid_date) : new Date(inst.due_date);

        const pComp = inst.principal_component ? new Decimal(inst.principal_component.toString()).toFixed(2) : '0';
        const iComp = inst.interest_component ? new Decimal(inst.interest_component.toString()).toFixed(2) : '0';

        allTx.push({
          id: `tx_loan_emi_${inst.id}`,
          date: dateVal.toISOString(),
          direction: 'outflow',
          type: 'loan_emi',
          title: `${loan.name || loan.type} — Installment #${inst.installment_number}`,
          subtitle: `Principal: ₹${pComp} • Interest: ₹${iComp}`,
          amount: amt.toFixed(2),
          currency: loan.currency || baseCurrency,
          convertedAmount: conv.toFixed(2),
          memberId: loan.member_id,
          memberName: memberMap.get(loan.member_id) || 'Family Member',
          source: 'loan',
          rawEntityId: inst.id,
          label: null,
          notes: (inst as any).notes || null,
          projects: projectsForLoan(loan.id),
          tagTarget: { kind: 'loan', id: loan.id },
        });
      }

      // 4b. Prepayments & Gold Loan payments
      const prepayments = await this.prepaymentRepository.findByLoanId(loan.id);
      for (const prepay of prepayments) {
        const amt = new Decimal(prepay.amount.toString());
        const conv = this.convert(amt, loan.currency || baseCurrency, baseCurrency, ratesMap);
        const txType = isGold ? 'gold_loan_payment' : 'loan_prepayment';
        const title = isGold
          ? `${loan.name || 'Gold Loan'} — Payment`
          : `${loan.name || loan.type} — Part Payment`;
        const subtitle = prepay.notes || (isGold ? 'Gold Loan ledger payment' : 'Tenure/EMI reduction');

        allTx.push({
          id: `tx_loan_prep_${prepay.id}`,
          date: new Date(prepay.date).toISOString(),
          direction: 'outflow',
          type: txType,
          title,
          subtitle,
          amount: amt.toFixed(2),
          currency: loan.currency || baseCurrency,
          convertedAmount: conv.toFixed(2),
          memberId: loan.member_id,
          memberName: memberMap.get(loan.member_id) || 'Family Member',
          source: 'loan',
          rawEntityId: prepay.id,
          label: null,
          notes: prepay.notes || null,
          projects: projectsForLoan(loan.id),
          tagTarget: { kind: 'loan', id: loan.id },
        });
      }
    }

    // Sort strictly latest first
    allTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply Filters
    let filtered = allTx;

    // Filter by member
    if (query.memberId && query.memberId !== 'all') {
      filtered = filtered.filter((t) => t.memberId === query.memberId);
    }

    // Filter by flow (inflow vs outflow)
    if (query.flow && query.flow !== 'all') {
      filtered = filtered.filter((t) => t.direction === query.flow);
    }

    // Filter by source
    if (query.source && query.source !== 'all') {
      filtered = filtered.filter((t) => t.source === query.source);
    }

    // Filter by project tag
    if (query.projectId && query.projectId !== 'all') {
      filtered =
        query.projectId === 'untagged'
          ? filtered.filter((t) => t.projects.length === 0)
          : filtered.filter((t) => t.projects.some((p) => p.id === query.projectId));
    }

    // Filter by duration / date range
    const now = new Date();
    if (query.startDate && query.endDate) {
      const s = new Date(query.startDate).getTime();
      const e = new Date(query.endDate).getTime();
      filtered = filtered.filter((t) => {
        const d = new Date(t.date).getTime();
        return d >= s && d <= e;
      });
    } else if (query.duration && query.duration !== 'all') {
      let pastLimit = new Date();
      if (query.duration === '1m') {
        pastLimit.setDate(pastLimit.getDate() - 30);
      } else if (query.duration === '3m' || query.duration === 'quarterly') {
        pastLimit.setDate(pastLimit.getDate() - 90);
      } else if (query.duration === '1y' || query.duration === 'yearly') {
        pastLimit.setFullYear(pastLimit.getFullYear() - 1);
      }
      const limitMs = pastLimit.getTime();
      filtered = filtered.filter((t) => new Date(t.date).getTime() >= limitMs);
    }

    // Filter by search keyword
    if (query.search && query.search.trim()) {
      const q = query.search.toLowerCase().trim();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.subtitle.toLowerCase().includes(q) ||
          t.memberName.toLowerCase().includes(q) ||
          t.projects.some((p) => p.name.toLowerCase().includes(q)) ||
          t.amount.includes(q),
      );
    }

    // Compute Summary KPIs across all filtered transactions
    let totalInflow = new Decimal(0);
    let totalOutflow = new Decimal(0);

    for (const t of filtered) {
      const cAmt = new Decimal(t.convertedAmount);
      if (t.direction === 'inflow') {
        totalInflow = totalInflow.plus(cAmt);
      } else {
        totalOutflow = totalOutflow.plus(cAmt);
      }
    }
    const netCashFlow = totalInflow.minus(totalOutflow);

    // Pagination
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 50));
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    return {
      summary: {
        totalInflow: totalInflow.toFixed(2),
        totalOutflow: totalOutflow.toFixed(2),
        netCashFlow: netCashFlow.toFixed(2),
        transactionCount: totalCount,
        baseCurrency,
      },
      transactions: paginatedItems,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages,
      },
    };
  }
}
