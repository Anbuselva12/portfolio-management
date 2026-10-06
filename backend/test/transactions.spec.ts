import { describe, it, expect, beforeEach } from 'vitest';
import { TransactionsService } from '../src/transactions/transactions.service';
import {
  LocalStorageIncomeRepository,
  LocalStorageExpenseRepository,
  LocalStorageExpenseCategoryRepository,
  LocalStorageLoanRepository,
  LocalStorageRepaymentScheduleRepository,
  LocalStoragePrepaymentRepository,
  LocalStorageMemberRepository,
  LocalStorageFamilyRepository,
  LocalStorageCurrencyRateRepository,
  LocalStorageStore,
} from '../src/repositories/local-storage';

describe('TransactionsService — Unified Statement of Transactions', () => {
  let service: TransactionsService;
  let incomeRepo: LocalStorageIncomeRepository;
  let expenseRepo: LocalStorageExpenseRepository;
  let categoryRepo: LocalStorageExpenseCategoryRepository;
  let loanRepo: LocalStorageLoanRepository;
  let scheduleRepo: LocalStorageRepaymentScheduleRepository;
  let prepaymentRepo: LocalStoragePrepaymentRepository;
  let memberRepo: LocalStorageMemberRepository;
  let familyRepo: LocalStorageFamilyRepository;
  let currencyRepo: LocalStorageCurrencyRateRepository;

  const familyId = 'fam_test_1';
  const memberId = 'mem_test_1';

  beforeEach(async () => {
    LocalStorageStore.clear();

    incomeRepo = new LocalStorageIncomeRepository();
    expenseRepo = new LocalStorageExpenseRepository();
    categoryRepo = new LocalStorageExpenseCategoryRepository();
    loanRepo = new LocalStorageLoanRepository();
    scheduleRepo = new LocalStorageRepaymentScheduleRepository();
    prepaymentRepo = new LocalStoragePrepaymentRepository();
    memberRepo = new LocalStorageMemberRepository();
    familyRepo = new LocalStorageFamilyRepository();
    currencyRepo = new LocalStorageCurrencyRateRepository();

    service = new TransactionsService(
      incomeRepo,
      expenseRepo,
      categoryRepo,
      loanRepo,
      scheduleRepo,
      prepaymentRepo,
      memberRepo,
      familyRepo,
      currencyRepo,
    );

    // Setup base family & member
    await familyRepo.create({
      id: familyId,
      name: 'Anbu Family',
      base_currency: 'INR',
    });

    await memberRepo.create({
      id: memberId,
      family_id: familyId,
      username: 'anbu',
      display_name: 'Anbuselvam',
      role: 'primary_admin',
    });
  });

  it('aggregates one-off income, confirmed recurring receipt, expense, paid EMI, and prepayment', async () => {
    // 1. One-off income
    await incomeRepo.create({
      family_id: familyId,
      member_id: memberId,
      label: 'Diwali Bonus',
      type: 'bonus',
      amount: '50000',
      currency: 'INR',
      recurrence: 'one_off',
      start_date: new Date('2026-10-01'),
    });

    // 2. Recurring income + confirmed receipt
    const recurring = await incomeRepo.create({
      family_id: familyId,
      member_id: memberId,
      label: 'Monthly Salary',
      type: 'salary',
      amount: '100000',
      currency: 'INR',
      recurrence: 'monthly',
      start_date: new Date('2026-01-01'),
    });

    await incomeRepo.upsertReceipt({
      income_id: recurring.id,
      family_id: familyId,
      member_id: memberId,
      year_month: '2026-09',
      scheduled_amount: '100000',
      received_amount: '100000',
      status: 'received',
      received_date: new Date('2026-09-30'),
    });

    // 3. Household expense
    const cat = await categoryRepo.create({
      family_id: familyId,
      name: 'Groceries',
    });

    await expenseRepo.create({
      family_id: familyId,
      member_id: memberId,
      category_id: cat.id,
      amount: '12000',
      currency: 'INR',
      date: new Date('2026-10-02'),
      source: 'manual',
    });

    // 4. Loan + paid installment
    const loan = await loanRepo.create({
      family_id: familyId,
      member_id: memberId,
      name: 'Home Loan',
      type: 'home',
      principal: '5000000',
      interest_rate: '8.5',
      emi_amount: '45000',
      tenure_months: 240,
      currency: 'INR',
      start_date: new Date('2026-01-01'),
      status: 'active',
    });

    await scheduleRepo.createMany([
      {
        id: 'inst-1',
        loan_id: loan.id,
        installment_number: 1,
        due_date: new Date('2026-02-01'),
        emi_amount: '45000',
        principal_component: '15000',
        interest_component: '30000',
        opening_balance: '5000000',
        closing_balance: '4985000',
        is_paid: true,
        paid_date: new Date('2026-02-01'),
      },
      {
        id: 'inst-2',
        loan_id: loan.id,
        installment_number: 2,
        due_date: new Date('2026-03-01'),
        emi_amount: '45000',
        principal_component: '15100',
        interest_component: '29900',
        opening_balance: '4985000',
        closing_balance: '4969900',
        is_paid: false,
      },
    ]);

    // 5. Prepayment
    await prepaymentRepo.create({
      id: 'prep-1',
      loan_id: loan.id,
      amount: '20000',
      date: new Date('2026-05-15'),
      notes: 'Bonus part payment',
    });

    const result = await service.getTransactions(familyId, { duration: 'all' });

    // Total inflows: 50,000 + 100,000 = 150,000
    // Total outflows: 12,000 + 45,000 + 20,000 = 77,000
    // Net: 150,000 - 77,000 = 73,000
    expect(result.summary.totalInflow).toBe('150000.00');
    expect(result.summary.totalOutflow).toBe('77000.00');
    expect(result.summary.netCashFlow).toBe('73000.00');
    expect(result.summary.transactionCount).toBe(5);

    // Verify sort is latest-first
    expect(result.transactions[0].date >= result.transactions[1].date).toBe(true);
    expect(result.transactions[1].date >= result.transactions[2].date).toBe(true);
  });

  it('filters by flow correctly (inflow vs outflow)', async () => {
    await incomeRepo.create({
      family_id: familyId,
      member_id: memberId,
      label: 'Consulting',
      type: 'business',
      amount: '25000',
      currency: 'INR',
      recurrence: 'one_off',
      start_date: new Date('2026-10-01'),
    });

    const cat = await categoryRepo.create({ family_id: familyId, name: 'Dining' });
    await expenseRepo.create({
      family_id: familyId,
      member_id: memberId,
      category_id: cat.id,
      amount: '3000',
      currency: 'INR',
      date: new Date('2026-10-02'),
      source: 'manual',
    });

    const inflowsOnly = await service.getTransactions(familyId, { flow: 'inflow' });
    expect(inflowsOnly.transactions.length).toBe(1);
    expect(inflowsOnly.transactions[0].direction).toBe('inflow');
    expect(inflowsOnly.summary.totalInflow).toBe('25000.00');
    expect(inflowsOnly.summary.totalOutflow).toBe('0.00');

    const outflowsOnly = await service.getTransactions(familyId, { flow: 'outflow' });
    expect(outflowsOnly.transactions.length).toBe(1);
    expect(outflowsOnly.transactions[0].direction).toBe('outflow');
    expect(outflowsOnly.summary.totalInflow).toBe('0.00');
    expect(outflowsOnly.summary.totalOutflow).toBe('3000.00');
  });

  it('ignores auto-queued loan_emi_auto expenses to prevent double-counting', async () => {
    const cat = await categoryRepo.create({ family_id: familyId, name: 'Loans & EMI' });
    await expenseRepo.create({
      family_id: familyId,
      member_id: memberId,
      category_id: cat.id,
      amount: '45000',
      currency: 'INR',
      date: new Date('2026-10-05'),
      source: 'loan_emi_auto',
    });

    const result = await service.getTransactions(familyId, { duration: 'all' });
    expect(result.transactions.length).toBe(0);
    expect(result.summary.totalOutflow).toBe('0.00');
  });
});
