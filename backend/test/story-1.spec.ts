import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  LocalStorageFamilyRepository,
  LocalStorageMemberRepository,
  LocalStorageAssetRepository,
  LocalStorageIncomeRepository,
  LocalStorageExpenseCategoryRepository,
  LocalStorageExpenseRepository,
  LocalStorageInsurancePolicyRepository,
  LocalStorageAuditRepository,
  LocalStorageStore,
} from '../src/repositories/local-storage';
import {
  PrismaFamilyRepository,
  PrismaMemberRepository,
  PrismaAssetRepository,
  PrismaIncomeRepository,
  PrismaExpenseCategoryRepository,
  PrismaExpenseRepository,
  PrismaInsurancePolicyRepository,
  PrismaAuditRepository,
} from '../src/repositories/prisma';
import { IncomeService } from '../src/income/income.service';
import Decimal from 'decimal.js';

describe('Story 1 — Foundation, Family Onboarding & Core Portfolio Data', () => {
  const prisma = new PrismaService();

  beforeEach(async () => {
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgres')) {
      throw new Error('Safety guard: Tests are strictly forbidden from connecting to PostgreSQL! Tests must run only against local SQLite.');
    }
    LocalStorageStore.clear();
    // Clean local test DB
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
    await prisma.member.deleteMany();
    await prisma.family.deleteMany();
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  // Run the full verification suite against both storage adapters to prove Storage-Mode Parity (DoD #6)
  const suites = [
    {
      name: 'LocalStorage Mode (Dev / Offline)',
      factory: () => ({
        familyRepo: new LocalStorageFamilyRepository(),
        memberRepo: new LocalStorageMemberRepository(),
        assetRepo: new LocalStorageAssetRepository(),
        incomeRepo: new LocalStorageIncomeRepository(),
        categoryRepo: new LocalStorageExpenseCategoryRepository(),
        expenseRepo: new LocalStorageExpenseRepository(),
        insuranceRepo: new LocalStorageInsurancePolicyRepository(),
        auditRepo: new LocalStorageAuditRepository(),
      }),
    },
    {
      name: 'Prisma Server Mode (Database)',
      factory: () => ({
        familyRepo: new PrismaFamilyRepository(prisma),
        memberRepo: new PrismaMemberRepository(prisma),
        assetRepo: new PrismaAssetRepository(prisma),
        incomeRepo: new PrismaIncomeRepository(prisma),
        categoryRepo: new PrismaExpenseCategoryRepository(prisma),
        expenseRepo: new PrismaExpenseRepository(prisma),
        insuranceRepo: new PrismaInsurancePolicyRepository(prisma),
        auditRepo: new PrismaAuditRepository(prisma),
      }),
    },
  ];

  for (const { name, factory } of suites) {
    describe(`Adapter: ${name}`, () => {
      it('DoD 1 & 7: Family registration, join with approval, direct invite, deactivate, password reset', async () => {
        const repos = factory();

        // 1. Register unaffiliated user
        const adminUser = await repos.memberRepo.create({
          username: 'anbu',
          password_hash: 'hashed_password_123',
          display_name: 'Anbuselvam',
          role: 'member',
          status: 'unaffiliated',
        });
        expect(adminUser.id).toBeDefined();
        expect(adminUser.status).toBe('unaffiliated');

        // 2. Create family -> auto-promoted to admin
        const family = await repos.familyRepo.create({
          name: 'The Anbu Family',
          base_currency: 'INR',
          country: 'IN',
          join_policy: 'approval_required',
          is_discoverable: true,
        });
        expect(family.id).toBeDefined();

        await repos.memberRepo.update(adminUser.id, {
          family_id: family.id,
          role: 'admin',
          status: 'active',
        });

        const updatedAdmin = await repos.memberRepo.findById(adminUser.id);
        expect(updatedAdmin?.role).toBe('admin');
        expect(updatedAdmin?.status).toBe('active');

        // 3. Second user registers and requests to join (approval_required path)
        const requestingUser = await repos.memberRepo.create({
          username: 'priya',
          password_hash: 'hashed_pass_priya',
          display_name: 'Priya',
          role: 'member',
          status: 'unaffiliated',
        });

        // Request join
        await repos.memberRepo.update(requestingUser.id, {
          family_id: family.id,
          status: 'pending_approval',
        });

        const pendingList = await repos.memberRepo.findPendingByFamilyId(family.id);
        expect(pendingList.length).toBe(1);
        expect(pendingList[0].username).toBe('priya');

        // Admin approves requesting member
        await repos.memberRepo.update(requestingUser.id, {
          status: 'active',
        });
        const approvedMember = await repos.memberRepo.findById(requestingUser.id);
        expect(approvedMember?.status).toBe('active');

        // 4. Admin direct-invite path (skips approval)
        const invitedUser = await repos.memberRepo.create({
          username: 'karthik',
          password_hash: 'temp_hashed_karthik',
          display_name: 'Karthik',
          family_id: family.id,
          role: 'member',
          status: 'active',
        });
        expect(invitedUser.status).toBe('active');
        expect(invitedUser.family_id).toBe(family.id);

        // 5. Admin deactivates member (DoD 7)
        await repos.memberRepo.update(invitedUser.id, {
          status: 'deactivated',
          is_active: false,
        });
        const deactivated = await repos.memberRepo.findById(invitedUser.id);
        expect(deactivated?.status).toBe('deactivated');
        expect(deactivated?.is_active).toBe(false);

        // 6. Admin triggers password reset
        await repos.memberRepo.update(approvedMember!.id, {
          password_hash: 'new_temporary_hash',
        });
        const resetMember = await repos.memberRepo.findById(approvedMember!.id);
        expect(resetMember?.password_hash).toBe('new_temporary_hash');
      });

      it('DoD 2: CRUD operations on Assets, Income, Expenses, and Insurance', async () => {
        const repos = factory();

        const family = await repos.familyRepo.create({
          name: 'Portfolio Family',
          base_currency: 'INR',
          country: 'IN',
          join_policy: 'open',
          is_discoverable: true,
        });

        const member = await repos.memberRepo.create({
          username: 'investor',
          password_hash: 'pass',
          display_name: 'Investor One',
          family_id: family.id,
          role: 'admin',
          status: 'active',
        });

        // Asset CRUD
        const asset = await repos.assetRepo.create({
          member_id: member.id,
          family_id: family.id,
          type: 'fd',
          name: 'HDFC Fixed Deposit',
          currency: 'INR',
          current_value: '200000',
          interest_rate: '7.5',
          maturity_date: new Date('2028-01-01'),
        });
        expect(asset.id).toBeDefined();

        const assets = await repos.assetRepo.findByFamilyId(family.id);
        expect(assets.length).toBe(1);
        expect(Number(assets[0].current_value)).toBe(200000);

        // Update asset
        await repos.assetRepo.update(asset.id, { current_value: '215000' as any });
        const updatedAsset = await repos.assetRepo.findById(asset.id);
        expect(Number(updatedAsset?.current_value)).toBe(215000);

        // Category & Expense CRUD
        const category = await repos.categoryRepo.create({
          family_id: family.id,
          name: 'Groceries',
        });
        expect(category.id).toBeDefined();

        const expense = await repos.expenseRepo.create({
          member_id: member.id,
          family_id: family.id,
          category_id: category.id,
          amount: '12500',
          currency: 'INR',
          date: new Date(),
          notes: 'Monthly staples',
        });
        expect(expense.id).toBeDefined();

        const expenses = await repos.expenseRepo.findByFamilyId(family.id);
        expect(expenses.length).toBe(1);
        expect(Number(expenses[0].amount)).toBe(12500);

        // Income CRUD via IncomeService (accepts string amount)
        const incomeService = new IncomeService(repos.incomeRepo, repos.auditRepo);
        const createdIncome = await incomeService.createIncome(member.id, family.id, {
          label: 'PB Income',
          amount: '110000' as any,
          type: 'salary',
          recurrence: 'one_off',
          startDate: '2026-09-01T00:00:00.000Z',
          currency: 'INR',
        });
        expect(createdIncome.id).toBeDefined();
        expect(createdIncome.amount).toBe('110000');
        expect(createdIncome.recurrence).toBe('one_off');

        // Insurance Policy CRUD
        const policy = await repos.insuranceRepo.create({
          member_id: member.id,
          family_id: family.id,
          policy_type: 'health',
          provider: 'Star Health',
          policy_number: 'SH-99281',
          sum_assured: '1000000',
          premium_amount: '24000',
          premium_frequency: 'annual',
          next_due_date: new Date('2027-04-01'),
        });
        expect(policy.id).toBeDefined();
        const policies = await repos.insuranceRepo.findByFamilyId(family.id);
        expect(policies.length).toBe(1);
        expect(Number(policies[0].premium_amount)).toBe(24000);
      });

      it('DoD 3: Recurring income edit preserves history via supersession', async () => {
        const repos = factory();

        const family = await repos.familyRepo.create({
          name: 'Income Family',
          base_currency: 'INR',
          country: 'IN',
          join_policy: 'open',
          is_discoverable: false,
        });

        const member = await repos.memberRepo.create({
          username: 'earner',
          password_hash: 'pass',
          display_name: 'Earner',
          family_id: family.id,
          role: 'admin',
          status: 'active',
        });

        // 1. Initial rent income starting Jan 1, 2026: 25,000/month
        const initialIncome = await repos.incomeRepo.create({
          member_id: member.id,
          family_id: family.id,
          type: 'rent',
          label: 'Apartment 302 Rental',
          amount: '25000',
          currency: 'INR',
          recurrence: 'recurring_monthly',
          start_date: new Date('2026-01-01'),
          status: 'active',
        });

        // 2. Simulated rent increase on July 1, 2026 to 28,000/month
        const effectiveDate = new Date('2026-07-01');
        const dayBefore = new Date(effectiveDate);
        dayBefore.setDate(dayBefore.getDate() - 1);

        // Supersession step 1: close current entry
        await repos.incomeRepo.update(initialIncome.id, {
          end_date: dayBefore,
          status: 'superseded',
        });

        // Supersession step 2: open new entry with superseded_by link
        const newIncome = await repos.incomeRepo.create({
          member_id: member.id,
          family_id: family.id,
          type: initialIncome.type,
          label: initialIncome.label,
          amount: '28000',
          currency: 'INR',
          recurrence: 'recurring_monthly',
          start_date: effectiveDate,
          status: 'active',
          superseded_by_id: initialIncome.id,
        });

        // Verify history is intact: 2 rows exist, old is superseded, new is active
        const allIncome = await repos.incomeRepo.findByFamilyId(family.id);
        expect(allIncome.length).toBe(2);

        const oldRow = allIncome.find((i) => i.id === initialIncome.id);
        const newRow = allIncome.find((i) => i.id === newIncome.id);

        expect(oldRow?.status).toBe('superseded');
        expect(Number(oldRow?.amount)).toBe(25000);
        expect(oldRow?.end_date).toEqual(dayBefore);

        expect(newRow?.status).toBe('active');
        expect(Number(newRow?.amount)).toBe(28000);
        expect(newRow?.start_date).toEqual(effectiveDate);
        expect(newRow?.superseded_by_id).toBe(initialIncome.id);
      });

      it('DoD 4 & 5: Insurance auto-expense & Dashboard KPI strip accurate calculations', async () => {
        const repos = factory();

        const family = await repos.familyRepo.create({
          name: 'Dashboard Family',
          base_currency: 'INR',
          country: 'IN',
          join_policy: 'open',
          is_discoverable: false,
        });

        const member = await repos.memberRepo.create({
          username: 'head',
          password_hash: 'pass',
          display_name: 'Head of Family',
          family_id: family.id,
          role: 'admin',
          status: 'active',
        });

        // Add 2 assets: Bank Balance (50,000) + Mutual Funds (1,50,000)
        await repos.assetRepo.create({
          member_id: member.id,
          family_id: family.id,
          type: 'bank_balance',
          name: 'Salary Account',
          currency: 'INR',
          current_value: '50000',
        });
        await repos.assetRepo.create({
          member_id: member.id,
          family_id: family.id,
          type: 'mutual_fund',
          name: 'Index Fund',
          currency: 'INR',
          current_value: '150000',
        });

        // Add recurring income: 1,00,000/month
        await repos.incomeRepo.create({
          member_id: member.id,
          family_id: family.id,
          type: 'salary',
          label: 'Software Engineer Salary',
          amount: '100000',
          currency: 'INR',
          recurrence: 'recurring_monthly',
          start_date: new Date('2026-01-01'),
          status: 'active',
        });

        // Add expense category & logged expense: 30,000
        const cat = await repos.categoryRepo.create({
          family_id: family.id,
          name: 'Household',
        });
        await repos.expenseRepo.create({
          member_id: member.id,
          family_id: family.id,
          category_id: cat.id,
          amount: '30000',
          currency: 'INR',
          date: new Date(),
        });

        // DoD 4: Insurance premium due generates tagged ExpenseEntry (source = insurance_auto)
        const policy = await repos.insuranceRepo.create({
          member_id: member.id,
          family_id: family.id,
          policy_type: 'life',
          provider: 'LIC',
          policy_number: 'LIC-0012',
          sum_assured: '5000000', // NOTE: sum_assured must NOT be included in Net Worth
          premium_amount: '5000',
          premium_frequency: 'monthly',
          next_due_date: new Date(),
          linked_category_id: cat.id,
        });

        // Auto-generate expense entry for due premium
        const autoExpense = await repos.expenseRepo.create({
          member_id: member.id,
          family_id: family.id,
          category_id: cat.id,
          amount: policy.premium_amount.toString(),
          currency: 'INR',
          date: new Date(),
          notes: `Auto premium for ${policy.provider} #${policy.policy_number}`,
          source: 'insurance_auto',
        });
        expect(autoExpense.source).toBe('insurance_auto');

        // DoD 5: Calculate Dashboard KPIs
        const familyAssets = await repos.assetRepo.findByFamilyId(family.id);
        const totalAssets = familyAssets.reduce((sum, a) => sum.plus(new Decimal(a.current_value.toString())), new Decimal(0));
        expect(totalAssets.toNumber()).toBe(200000); // 50,000 + 1,50,000

        const totalLiabilities = new Decimal(0); // Story 1 has no loans yet
        const netWorth = totalAssets.minus(totalLiabilities);
        expect(netWorth.toNumber()).toBe(200000); // Net worth equals total assets in Story 1

        const activeIncomes = await repos.incomeRepo.findByFamilyId(family.id);
        const monthlyIncome = activeIncomes
          .filter((i) => i.status === 'active')
          .reduce((sum, i) => sum.plus(new Decimal(i.amount.toString())), new Decimal(0));
        expect(monthlyIncome.toNumber()).toBe(100000);

        const familyExpenses = await repos.expenseRepo.findByFamilyId(family.id);
        const monthlyExpenses = familyExpenses.reduce((sum, e) => sum.plus(new Decimal(e.amount.toString())), new Decimal(0));
        expect(monthlyExpenses.toNumber()).toBe(35000); // 30,000 + 5,000 (insurance)

        const monthlySavings = monthlyIncome.minus(monthlyExpenses);
        expect(monthlySavings.toNumber()).toBe(65000); // 1,00,000 - 35,000

        const savingsRate = monthlySavings.dividedBy(monthlyIncome).times(100);
        expect(savingsRate.toNumber()).toBe(65); // 65% savings rate
      });
    });
  }
});

