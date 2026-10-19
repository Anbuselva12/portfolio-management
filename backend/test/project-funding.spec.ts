import { describe, it, expect, beforeEach } from 'vitest';
import Decimal from 'decimal.js';
import { calculateFundingReturns } from '../src/tracker/funding-returns.calculator';
import { ProjectFundingService } from '../src/tracker/project-funding.service';
import { IncomeService } from '../src/income/income.service';
import {
  LocalStorageTrackerRepository,
  LocalStorageLoanRepository,
  LocalStorageIncomeRepository,
  LocalStorageRepaymentScheduleRepository,
  LocalStoragePrepaymentRepository,
  LocalStorageAuditRepository,
  LocalStorageStore,
} from '../src/repositories/local-storage';

const D = (v: string | number) => new Decimal(v);

describe('calculateFundingReturns — reference values', () => {
  const today = new Date('2026-10-19T00:00:00Z');

  it('derives funding, yield, payback and EMI coverage', () => {
    const r = calculateFundingReturns({
      invested: D('8156288.72'),
      currentValue: null,
      today,
      loans: [
        { loanId: 'l1', name: 'Personal', lender: 'HDFC', type: 'personal', status: 'active', allocated: D(3000000), basePrincipal: D(3000000), outstanding: D(2640000), emi: D(38200), interestPaid: D(148000) },
        { loanId: 'l2', name: 'Jewel', lender: 'Muthoot', type: 'jewel', status: 'active', allocated: D(600000), basePrincipal: D(1200000), outstanding: D(1110000), emi: D(14200), interestPaid: D(62000) },
      ],
      incomes: [
        { id: 'i1', label: 'House 4', type: 'rent', recurrence: 'recurring_monthly', status: 'active', amount: D(11000), startDate: new Date('2026-09-01'), endDate: null, receipts: [{ yearMonth: '2026-09', amount: D(11000) }, { yearMonth: '2026-10', amount: D(11000) }] },
        { id: 'i2', label: 'House 5', type: 'rent', recurrence: 'recurring_monthly', status: 'active', amount: D(5500), startDate: new Date('2026-07-01'), endDate: null, receipts: [{ yearMonth: '2026-10', amount: D(5500) }] },
      ],
    });

    expect(r.fundedByLoans).toBe('3600000.00');
    expect(r.ownFunds).toBe('4556288.72');
    expect(r.loansExceedInvested).toBe(false);
    // Second loan: half of it funds this project -> 50% share of outstanding / EMI / interest
    expect(r.loans[1].sharePct).toBe('50.00');
    expect(r.loans[1].emiShare).toBe('7100.00');
    expect(r.loanTotals.emiShare).toBe('45300.00');
    expect(r.loanTotals.interestPaidShare).toBe('179000.00');
    expect(r.monthlyIncome).toBe('16500.00');
    expect(r.totalIncomeReceived).toBe('27500.00');
    // 12 × 16,500 / 81,56,288.72 = 2.43 %
    expect(r.grossYieldPct).toBe('2.43');
    expect(r.netMonthlyAfterEmi).toBe('-28800.00');
    expect(r.incomeCoversEmiPct).toBe('36.42');
    expect(r.monthlySeries.map((m) => m.month)).toEqual(['2026-09', '2026-10']);
    expect(r.currentValue).toBeNull();
    expect(r.totalReturn).toBeNull();
  });

  it('adds appreciation and total return when a current value is set', () => {
    const r = calculateFundingReturns({
      invested: D(1000000),
      currentValue: D(1500000),
      today,
      loans: [],
      incomes: [{ id: 'i', label: 'Rent', type: 'rent', recurrence: 'recurring_monthly', status: 'active', amount: D(10000), startDate: new Date('2026-01-01'), endDate: null, receipts: [{ yearMonth: '2026-09', amount: D(10000) }] }],
    });
    expect(r.appreciation).toBe('500000.00');
    expect(r.totalReturn).toBe('510000.00');
    expect(r.totalReturnPct).toBe('51.00');
    expect(r.yieldOnCurrentValuePct).toBe('8.00');
    expect(r.paybackYears).toBe('8.3');
  });

  it('caps own funds at zero and flags loans exceeding spend; closed loans carry no EMI/outstanding', () => {
    const r = calculateFundingReturns({
      invested: D(100000),
      currentValue: null,
      today,
      incomes: [],
      loans: [{ loanId: 'l', name: 'Old', lender: 'X', type: 'personal', status: 'closed', allocated: D(150000), basePrincipal: D(150000), outstanding: D(0), emi: D(5000), interestPaid: D(1000) }],
    });
    expect(r.ownFunds).toBe('0.00');
    expect(r.loansExceedInvested).toBe(true);
    expect(r.loansExceedBy).toBe('50000.00');
    expect(r.loanTotals.emiShare).toBe('0.00');
    expect(r.incomeCoversEmiPct).toBeNull();
    expect(r.grossYieldPct).toBe('0.00');
  });

  it('ignores one-off income dated in the future and stopped streams for the monthly figure', () => {
    const r = calculateFundingReturns({
      invested: D(100000),
      currentValue: null,
      today,
      loans: [],
      incomes: [
        { id: 'a', label: 'Advance', type: 'rent', recurrence: 'one_off', status: 'active', amount: D(50000), startDate: new Date('2027-01-01'), endDate: null, receipts: [] },
        { id: 'b', label: 'Old tenant', type: 'rent', recurrence: 'recurring_monthly', status: 'stopped', amount: D(8000), startDate: new Date('2025-01-01'), endDate: new Date('2026-03-31'), receipts: [{ yearMonth: '2026-03', amount: D(8000) }] },
      ],
    });
    expect(r.totalIncomeReceived).toBe('8000.00');
    expect(r.monthlyIncome).toBe('0.00');
  });
});

describe('ProjectFundingService — allocations & tagging', () => {
  const familyId = 'fam_1';
  const memberId = 'mem_1';
  let trackerRepo: LocalStorageTrackerRepository;
  let loanRepo: LocalStorageLoanRepository;
  let incomeRepo: LocalStorageIncomeRepository;
  let service: ProjectFundingService;
  let incomeService: IncomeService;
  let projectA: string;
  let projectB: string;
  let loanId: string;

  beforeEach(async () => {
    LocalStorageStore.clear();
    trackerRepo = new LocalStorageTrackerRepository();
    loanRepo = new LocalStorageLoanRepository();
    incomeRepo = new LocalStorageIncomeRepository();
    const audit = new LocalStorageAuditRepository();
    service = new ProjectFundingService(
      trackerRepo,
      loanRepo,
      incomeRepo,
      new LocalStorageRepaymentScheduleRepository(),
      new LocalStoragePrepaymentRepository(),
      audit,
    );
    incomeService = new IncomeService(incomeRepo, audit, trackerRepo);

    projectA = (await trackerRepo.createProject({ family_id: familyId, created_by_id: memberId, name: 'SK Complex' })).id;
    projectB = (await trackerRepo.createProject({ family_id: familyId, created_by_id: memberId, name: 'New Business' })).id;
    loanId = (
      await loanRepo.create({
        family_id: familyId, member_id: memberId, type: 'personal', lender: 'HDFC', principal: '1000000',
        original_principal: '1000000', interest_rate: '11', tenure_months: 36, start_date: new Date(), emi_amount: '32000',
      })
    ).id;
  });

  it('lets one loan fund several projects and rejects over-allocation', async () => {
    const res = await service.setLoanAllocations(memberId, familyId, loanId, {
      allocations: [{ projectId: projectA, amount: 600000 }, { projectId: projectB, amount: '300000' }],
    });
    expect(res.allocations).toHaveLength(2);

    await expect(
      service.setLoanAllocations(memberId, familyId, loanId, {
        allocations: [{ projectId: projectA, amount: 700000 }, { projectId: projectB, amount: 400000 }],
      }),
    ).rejects.toThrow(/exceed/);

    // failed save leaves previous allocations intact
    expect((await service.getLoanAllocations(familyId, loanId)).allocations).toHaveLength(2);

    const cleared = await service.setLoanAllocations(memberId, familyId, loanId, { allocations: [] });
    expect(cleared.allocations).toHaveLength(0);
  });

  it('rejects duplicate projects, non-positive amounts and projects/loans of another family', async () => {
    await expect(
      service.setLoanAllocations(memberId, familyId, loanId, { allocations: [{ projectId: projectA, amount: 1 }, { projectId: projectA, amount: 2 }] }),
    ).rejects.toThrow(/only once/);
    await expect(
      service.setLoanAllocations(memberId, familyId, loanId, { allocations: [{ projectId: projectA, amount: 0 }] }),
    ).rejects.toThrow(/greater than zero/);
    await expect(
      service.setLoanAllocations(memberId, 'other_family', loanId, { allocations: [] }),
    ).rejects.toThrow(/not found/i);
    const foreign = (await trackerRepo.createProject({ family_id: 'other_family', created_by_id: 'x', name: 'Foreign' })).id;
    await expect(
      service.setLoanAllocations(memberId, familyId, loanId, { allocations: [{ projectId: foreign, amount: 1 }] }),
    ).rejects.toThrow(/not found in your family/);
  });

  it('builds funding & returns from expenses, allocations and tagged income', async () => {
    await trackerRepo.createExpense({ project_id: projectA, quantity: 1, price_per_qty: 2000000, total_cost: 2000000, purchase_date: new Date() });
    await service.setLoanAllocations(memberId, familyId, loanId, { allocations: [{ projectId: projectA, amount: 500000 }] });
    const rent = await incomeService.createIncome(memberId, familyId, {
      type: 'rent', label: 'House 4', amount: 11000, currency: 'INR', recurrence: 'recurring_monthly',
      startDate: '2026-01-01T00:00:00.000Z', projectId: projectA,
    });
    await incomeService.confirmReceipt(memberId, familyId, rent.id, '2026-09', { receivedAmount: 11000 });

    const r = await service.getFundingReturns(familyId, projectA);
    expect(r.invested).toBe('2000000.00');
    expect(r.fundedByLoans).toBe('500000.00');
    expect(r.ownFunds).toBe('1500000.00');
    expect(r.monthlyIncome).toBe('11000.00');
    expect(r.totalIncomeReceived).toBe('11000.00');
    expect(r.loanTotals.emiShare).toBe('16000.00');
  });

  it('rejects tagging income to a project of another family and carries the tag across revisions', async () => {
    const foreign = (await trackerRepo.createProject({ family_id: 'other_family', created_by_id: 'x', name: 'Foreign' })).id;
    await expect(
      incomeService.createIncome(memberId, familyId, {
        type: 'rent', label: 'Bad', amount: 1, currency: 'INR', recurrence: 'one_off', startDate: '2026-01-01T00:00:00.000Z', projectId: foreign,
      }),
    ).rejects.toThrow(/not found in your family/);

    const rent = await incomeService.createIncome(memberId, familyId, {
      type: 'rent', label: 'House 5', amount: 5500, currency: 'INR', recurrence: 'recurring_monthly', startDate: '2026-01-01T00:00:00.000Z', projectId: projectA,
    });
    // rent revision supersedes the old entry; new entry keeps the tag
    const revised = await incomeService.updateIncome(memberId, familyId, rent.id, { amount: 6000, effectiveDate: '2026-06-01T00:00:00.000Z' });
    expect(revised.project_id).toBe(projectA);

    // retagging the new entry retags the whole chain; null clears it
    await incomeService.updateIncome(memberId, familyId, revised.id, { projectId: projectB });
    const all = await incomeRepo.findByFamilyId(familyId);
    expect(all.every((i) => i.project_id === projectB)).toBe(true);
    await incomeService.updateIncome(memberId, familyId, revised.id, { projectId: null });
    expect((await incomeRepo.findByFamilyId(familyId)).every((i) => i.project_id === null)).toBe(true);
  });
});
