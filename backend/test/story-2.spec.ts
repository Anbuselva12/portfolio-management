import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  LocalStorageFamilyRepository,
  LocalStorageMemberRepository,
  LocalStorageLoanRepository,
  LocalStorageRepaymentScheduleRepository,
  LocalStoragePrepaymentRepository,
  LocalStorageRateRevisionRepository,
  LocalStorageAuditRepository,
  LocalStorageExpenseRepository,
  LocalStorageExpenseCategoryRepository,
  LocalStorageStore,
} from '../src/repositories/local-storage';
import {
  PrismaFamilyRepository,
  PrismaMemberRepository,
  PrismaLoanRepository,
  PrismaRepaymentScheduleRepository,
  PrismaPrepaymentRepository,
  PrismaRateRevisionRepository,
  PrismaAuditRepository,
  PrismaExpenseRepository,
  PrismaExpenseCategoryRepository,
} from '../src/repositories/prisma';
import { LoansService } from '../src/loans/loans.service';
import { ExpensesService } from '../src/expenses/expenses.service';
import { LoanEngine } from '../src/loans/engine/loan-engine';
import Decimal from 'decimal.js';

describe('Story 2 — Loan Engine, Amortization, Prepayments & Storage Parity', () => {
  const prisma = new PrismaService();

  beforeEach(async () => {
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgres')) {
      throw new Error('Safety guard: Tests are strictly forbidden from connecting to PostgreSQL! Tests must run only against local SQLite.');
    }
    LocalStorageStore.clear();
    await prisma.rateRevisionRecord.deleteMany();
    await prisma.prepaymentRecord.deleteMany();
    await prisma.repaymentInstallment.deleteMany();
    await prisma.loan.deleteMany();
    await prisma.auditLogEntry.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.expenseEntry.deleteMany();
    await prisma.insurancePolicy.deleteMany();
    await prisma.expenseCategory.deleteMany();
    await prisma.incomeEntry.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.trackerExpense.deleteMany();
    await prisma.trackerProject.deleteMany();
    await prisma.member.deleteMany();
    await prisma.family.deleteMany();
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  describe('Pure Mathematical Engine Tests', () => {
    it('DoD 1: Compound interest reducing balance matches reference amortization tables', () => {
      // Reference: Principal 10,00,000 at 8.5% for 120 months
      const principal = new Decimal(1000000);
      const rate = new Decimal(8.5);
      const tenure = 120;

      const emi = LoanEngine.calculateReducingEmi(principal, rate, tenure);
      expect(emi.toNumber()).toBe(12398.57);

      const schedule = LoanEngine.generateAmortizationSchedule(
        principal,
        rate,
        tenure,
        new Date('2026-01-01'),
        emi,
        'reducing_compound',
      );

      expect(schedule.length).toBe(120);
      expect(schedule[0].opening_balance.toNumber()).toBe(1000000);
      expect(schedule[0].interest_component.toNumber()).toBe(7083.33); // 1000000 * 0.085 / 12
      expect(schedule[0].principal_component.toNumber()).toBe(5315.24); // 12398.57 - 7083.33

      // Final installment must amortize balance to exactly 0.00
      const last = schedule[schedule.length - 1];
      expect(last.closing_balance.toNumber()).toBe(0);
    });

    it('DoD 1: Flat simple interest matches reference formula', () => {
      // Principal 1,00,000 at 10% for 12 months -> Interest = 10,000 -> Total = 1,10,000 -> EMI = 9166.67
      const principal = new Decimal(100000);
      const rate = new Decimal(10);
      const tenure = 12;

      const emi = LoanEngine.calculateFlatSimpleEmi(principal, rate, tenure);
      expect(emi.toNumber()).toBe(9166.67);

      const schedule = LoanEngine.generateAmortizationSchedule(
        principal,
        rate,
        tenure,
        new Date('2026-01-01'),
        emi,
        'flat_simple',
      );
      expect(schedule.length).toBe(12);
      expect(schedule[schedule.length - 1].closing_balance.toNumber()).toBe(0);
    });

    it('DoD 2: Newton-Raphson solver finds implied rate when EMI exceeds tolerance', () => {
      const principal = new Decimal(1000000);
      const statedRate = new Decimal(8.5);
      const tenure = 120;
      const bankEmi = new Decimal(13000); // Higher than 12,398.57 by 4.85% (> 1% tolerance)

      const reconciliation = LoanEngine.reconcileEmi(principal, statedRate, tenure, bankEmi);
      expect(reconciliation.hasDiscrepancy).toBe(true);
      expect(reconciliation.diffPct).toBeGreaterThan(1.0);
      expect(reconciliation.impliedRatePct).toBeDefined();

      // Implied rate should be ~9.64% p.a.
      const solvedRate = reconciliation.impliedRatePct!.toNumber();
      expect(solvedRate).toBeGreaterThan(9.6);
      expect(solvedRate).toBeLessThan(9.7);

      // Verify schedule generated with reconciled EMI amortizes to 0
      const schedule = LoanEngine.generateAmortizationSchedule(
        principal,
        reconciliation.impliedRatePct!,
        tenure,
        new Date('2026-01-01'),
        reconciliation.effectiveEmi,
      );
      expect(schedule[schedule.length - 1].closing_balance.toNumber()).toBe(0);
    });

    it('DoD 4: Prepayment impact calculation in both reduce_tenure and reduce_emi modes', () => {
      const outstanding = new Decimal(500000);
      const rate = new Decimal(9.0);
      const emi = new Decimal(10138.20);
      const remainingTenure = 60;
      const extraPayment = new Decimal(100000);
      const startDate = new Date('2026-01-01');
      const payoffDate = new Date('2031-01-01');

      // Mode 1: Reduce Tenure
      const tenureImpact = LoanEngine.calculatePrepaymentImpact(
        outstanding,
        rate,
        emi,
        remainingTenure,
        extraPayment,
        'reduce_tenure',
        startDate,
        payoffDate,
        'percentage_of_prepayment',
        new Decimal(2), // 2% penalty = 2,000
      );

      expect(tenureImpact.penaltyAmount.toNumber()).toBe(2000);
      expect(tenureImpact.tenureReducedMonths).toBeGreaterThan(10);
      expect(tenureImpact.interestSaved.toNumber()).toBeGreaterThan(30000);
      expect(tenureImpact.netBenefit.toNumber()).toBe(tenureImpact.interestSaved.minus(2000).toNumber());

      // Mode 2: Reduce EMI
      const emiImpact = LoanEngine.calculatePrepaymentImpact(
        outstanding,
        rate,
        emi,
        remainingTenure,
        extraPayment,
        'reduce_emi',
        startDate,
        payoffDate,
      );

      expect(emiImpact.newEmi.toNumber()).toBeLessThan(emi.toNumber());
      expect(emiImpact.interestSaved.toNumber()).toBeGreaterThan(10000);
    });
  });

  // Storage-Mode Parity Suite (DoD 6): Runs against LocalStorage and Prisma
  const storageAdapters = [
    {
      name: 'LocalStorage Mode',
      factory: () => ({
        familyRepo: new LocalStorageFamilyRepository(),
        memberRepo: new LocalStorageMemberRepository(),
        loanRepo: new LocalStorageLoanRepository(),
        scheduleRepo: new LocalStorageRepaymentScheduleRepository(),
        prepaymentRepo: new LocalStoragePrepaymentRepository(),
        rateRevisionRepo: new LocalStorageRateRevisionRepository(),
        auditRepo: new LocalStorageAuditRepository(),
        expenseRepo: new LocalStorageExpenseRepository(),
        categoryRepo: new LocalStorageExpenseCategoryRepository(),
      }),
    },
    {
      name: 'Prisma Mode',
      factory: () => ({
        familyRepo: new PrismaFamilyRepository(prisma),
        memberRepo: new PrismaMemberRepository(prisma),
        loanRepo: new PrismaLoanRepository(prisma),
        scheduleRepo: new PrismaRepaymentScheduleRepository(prisma),
        prepaymentRepo: new PrismaPrepaymentRepository(prisma),
        rateRevisionRepo: new PrismaRateRevisionRepository(prisma),
        auditRepo: new PrismaAuditRepository(prisma),
        expenseRepo: new PrismaExpenseRepository(prisma),
        categoryRepo: new PrismaExpenseCategoryRepository(prisma),
      }),
    },
  ];

  for (const { name, factory } of storageAdapters) {
    describe(`End-to-End Integration: ${name}`, () => {
      it('DoD 1, 3, 4: Creates loan, updates installment, and applies prepayment', async () => {
        const repos = factory();
        const service = new LoansService(
          repos.loanRepo,
          repos.scheduleRepo,
          repos.prepaymentRepo,
          repos.rateRevisionRepo,
          repos.auditRepo,
          repos.expenseRepo,
        );

        const family = await repos.familyRepo.create({
          name: 'Loan Test Family',
          base_currency: 'INR',
          country: 'IN',
          join_policy: 'open',
          is_discoverable: true,
        });

        const member = await repos.memberRepo.create({
          username: 'borrower',
          password_hash: 'pass',
          display_name: 'Borrower',
          family_id: family.id,
          role: 'admin',
          status: 'active',
        });

        // 1. Create a Home Loan: 20,00,000 at 8.5% for 60 months
        const loan = await service.createLoan(member.id, family.id, {
          type: 'home',
          lender: 'State Bank of India',
          principal: '2000000',
          interestRate: '8.5',
          tenureMonths: 60,
          startDate: '2026-01-01',
          currency: 'INR',
        });

        expect(loan.id).toBeDefined();
        expect(loan.status).toBe('active');

        // Check amortization schedule
        const schedule = await service.getSchedule(loan.id, family.id);
        expect(schedule.length).toBe(60);
        expect(Number(schedule[0].opening_balance)).toBe(2000000);

        // 2. DoD 3: Manual inline row correction
        const firstInst = schedule[0];
        const updatedInst = await service.updateInstallment(loan.id, firstInst.id, family.id, member.id, {
          isPaid: true,
          notes: 'Paid via auto-debit',
        });
        expect(updatedInst.is_paid).toBe(true);
        expect(updatedInst.is_manually_edited).toBe(true);

        // 3. DoD 4: Apply prepayment of 2,00,000 (reduce tenure) with broken-period interest
        const brokenInterest = LoanEngine.calculateBrokenPeriodInterest(new Decimal('1800000'), new Decimal('8.5'), 14);
        expect(Number(brokenInterest)).toBeGreaterThan(0);

        const prepayment = await service.applyPrepayment(loan.id, family.id, member.id, {
          amount: '200000',
          date: '2026-02-01',
          mode: 'reduce_tenure',
          accruedInterest: '120.00',
        });

        expect(prepayment.id).toBeDefined();
        expect(Number(prepayment.amount)).toBe(200000);
        expect(Number(prepayment.accrued_interest)).toBe(120);

        // Verify future schedule was regenerated and shortened
        const postSchedule = await service.getSchedule(loan.id, family.id);
        expect(postSchedule.length).toBeLessThan(60); // Tenure successfully reduced
        expect(postSchedule[0].is_paid).toBe(true); // First paid installment was preserved

        // 4. Rate Revision: Rate cut from 8.5% to 7.4% keeping EMI fixed
        const rateRevision = await service.applyRateRevision(loan.id, family.id, member.id, {
          newRate: '7.4',
          policy: 'keep_emi',
          effectiveDate: '2026-03-01',
          notes: 'RBI repo rate cut',
        });

        expect(rateRevision.id).toBeDefined();
        expect(Number(rateRevision.new_rate)).toBe(7.4);
        expect(Number(rateRevision.interest_saved)).toBeGreaterThan(0);

        const postRevisionSchedule = await service.getSchedule(loan.id, family.id);
        expect(postRevisionSchedule.length).toBeLessThanOrEqual(postSchedule.length);

        // 5. Calibrate Loan: Sync to current bank statement
        await service.calibrateLoan(loan.id, family.id, member.id, {
          currentOutstanding: '3439456',
          remainingTenureMonths: 129,
          currentRate: '7.4',
          emiAmount: '38848',
          effectiveDate: '2026-04-01',
        });

        const calibratedSchedule = await service.getSchedule(loan.id, family.id);
        expect(calibratedSchedule.length).toBe(129);
        expect(Number(calibratedSchedule[0].opening_balance)).toBe(3439456);
        // Final month residual tail clears closing balance to exactly 0
        expect(Number(calibratedSchedule[128].closing_balance)).toBe(0);
      });

      it('DoD 7-12: Auto-queues monthly EMI, syncs payment bi-directionally, and persists custom loan metadata', async () => {
        const repos = factory();
        const loansService = new LoansService(
          repos.loanRepo,
          repos.scheduleRepo,
          repos.prepaymentRepo,
          repos.rateRevisionRepo,
          repos.auditRepo,
          repos.expenseRepo,
        );
        const expensesService = new ExpensesService(
          repos.expenseRepo,
          repos.categoryRepo,
          repos.auditRepo,
          repos.scheduleRepo,
          repos.loanRepo,
        );

        const family = await repos.familyRepo.create({
          name: 'EMI Sync Family',
          base_currency: 'INR',
          country: 'IN',
          join_policy: 'open',
          is_discoverable: true,
        });

        const member = await repos.memberRepo.create({
          username: 'emisyncuser',
          password_hash: 'pass',
          display_name: 'EMI User',
          family_id: family.id,
          role: 'admin',
          status: 'active',
        });

        // 1. Create a Home Loan with custom metadata and auto-queue reminders enabled
        const homeLoan = await loansService.createLoan(member.id, family.id, {
          type: 'home',
          name: 'Chennai Home Loan Top Up',
          placeOrPurpose: 'Chennai Villa',
          comments: 'HDFC flexi floating rate',
          emiRemindersEnabled: true,
          lender: 'HDFC Bank',
          principal: '3910000',
          interestRate: '8.65',
          tenureMonths: 180,
          startDate: '2026-05-01',
          currency: 'INR',
        });

        expect(homeLoan.name).toBe('Chennai Home Loan Top Up');
        expect(homeLoan.place_or_purpose).toBe('Chennai Villa');
        expect(homeLoan.comments).toBe('HDFC flexi floating rate');
        expect(homeLoan.emi_reminders_enabled).toBe(true);

        // 2. Create a Gold Loan (bullet simple interest) with reminders enabled
        const goldLoan = await loansService.createLoan(member.id, family.id, {
          type: 'jewel',
          name: 'Annual Jewel Loan',
          placeOrPurpose: 'Emergency Gold',
          comments: 'Annual bullet interest only',
          emiRemindersEnabled: true,
          lender: 'Muthoot Finance',
          principal: '500000',
          interestRate: '9.0',
          tenureMonths: 12,
          startDate: '2026-05-01',
          currency: 'INR',
          interestType: 'flat_simple',
        });

        // 3. Lazy auto-queue: Fetch expenses for May 2026 (month 5)
        const mayExpenses = await expensesService.getExpenses(family.id, 2026, 5);

        // Verify Home Loan EMI was auto-queued
        const homeEmiExp = mayExpenses.find((e: any) => e.loan_id === homeLoan.id);
        expect(homeEmiExp).toBeDefined();
        expect(homeEmiExp.source).toBe('loan_emi_auto');
        expect(homeEmiExp.is_paid).toBe(false);

        // Verify Gold Loan was EXCLUDED from monthly auto-queue
        const goldEmiExp = mayExpenses.find((e: any) => e.loan_id === goldLoan.id);
        expect(goldEmiExp).toBeUndefined();

        // 4. Bi-directional sync test 1: Mark installment as paid from loan engine
        const schedule = await loansService.getSchedule(homeLoan.id, family.id);
        const mayInstallment = schedule[0];

        await loansService.updateInstallment(homeLoan.id, mayInstallment.id, family.id, member.id, {
          isPaid: true,
        });

        // Verify expense is now marked as paid
        const updatedMayExpenses = await expensesService.getExpenses(family.id, 2026, 5);
        const updatedHomeEmiExp = updatedMayExpenses.find((e: any) => e.id === homeEmiExp.id);
        expect(updatedHomeEmiExp.is_paid).toBe(true);

        // 5. Bi-directional sync test 2: Mark unpaid from expense queue
        await expensesService.markEmiPaid(member.id, family.id, homeEmiExp.id, false);

        // Verify installment is now marked as unpaid
        const postSchedule = await loansService.getSchedule(homeLoan.id, family.id);
        expect(postSchedule[0].is_paid).toBe(false);
      });
    });
  }
});
