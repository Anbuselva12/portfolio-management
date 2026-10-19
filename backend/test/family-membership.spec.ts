import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { FamilyMembershipService } from '../src/family/family-membership.service';

const prisma = new PrismaService();
const service = new FamilyMembershipService(prisma);

async function wipe() {
  await prisma.familyNotification.deleteMany();
  await prisma.projectLoanAllocation.deleteMany();
  await prisma.trackerExpense.deleteMany();
  await prisma.trackerProject.deleteMany();
  await prisma.monthlyIncomeReceipt.deleteMany();
  await prisma.incomeEntry.updateMany({ data: { superseded_by_id: null } });
  await prisma.incomeEntry.deleteMany();
  await prisma.repaymentInstallment.deleteMany();
  await prisma.prepaymentRecord.deleteMany();
  await prisma.rateRevisionRecord.deleteMany();
  await prisma.expenseEntry.deleteMany();
  await prisma.insurancePolicy.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.expenseCategory.deleteMany();
  await prisma.suggestionSnapshot.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.currencyRate.deleteMany();
  await prisma.member.deleteMany();
  await prisma.family.deleteMany();
}

const newMember = (username: string, extra: Record<string, unknown> = {}) =>
  prisma.member.create({
    data: {
      username,
      password_hash: 'x',
      display_name: username,
      status: 'unaffiliated',
      ...extra,
    },
  });

async function addLoan(familyId: string, memberId: string) {
  const loan = await prisma.loan.create({
    data: {
      family_id: familyId,
      member_id: memberId,
      type: 'personal',
      lender: 'Personal loan',
      principal: 100000,
      original_principal: 100000,
      interest_rate: 12,
      tenure_months: 12,
      start_date: new Date('2026-01-01'),
      emi_amount: 8885,
    },
  });
  await prisma.repaymentInstallment.create({
    data: {
      loan_id: loan.id,
      installment_number: 1,
      due_date: new Date('2026-02-01'),
      opening_balance: 100000,
      emi_amount: 8885,
      principal_component: 7885,
      interest_component: 1000,
      closing_balance: 92115,
    },
  });
  return loan;
}

describe('FamilyMembershipService', () => {
  beforeEach(wipe);
  afterAll(async () => {
    await wipe();
    await prisma.$disconnect();
  });

  it('skip creates a hidden solo workspace with default categories and reuses it later', async () => {
    const m = await newMember('solo');
    const first = await service.skipFamily(m.id);
    const fam = await prisma.family.findUnique({
      where: { id: first.familyId },
    });
    expect(fam?.is_personal).toBe(true);
    expect(fam?.owner_member_id).toBe(m.id);
    expect(
      await prisma.expenseCategory.count({ where: { family_id: fam!.id } }),
    ).toBeGreaterThan(5);
    const me = await prisma.member.findUnique({ where: { id: m.id } });
    expect(me).toMatchObject({
      family_id: fam!.id,
      role: 'admin',
      status: 'active',
    });

    await expect(service.skipFamily(m.id)).rejects.toThrow(/already/);
    await prisma.member.update({
      where: { id: m.id },
      data: { family_id: null, status: 'unaffiliated' },
    });
    expect((await service.skipFamily(m.id)).familyId).toBe(fam!.id);
  });

  it('converts a solo workspace into a family in place', async () => {
    const m = await newMember('owner');
    const { familyId } = await service.skipFamily(m.id);
    const fam = await service.convertToFamily(m.id, familyId, {
      name: 'My Family',
      baseCurrency: 'INR',
      country: 'IN',
      joinPolicy: 'approval_required',
      isDiscoverable: true,
    });
    expect(fam.is_personal).toBe(false);
    expect(fam.id).toBe(familyId);
    await expect(
      service.convertToFamily(m.id, familyId, {
        name: 'x',
        baseCurrency: 'INR',
        country: 'IN',
        joinPolicy: 'open',
        isDiscoverable: false,
      }),
    ).rejects.toThrow(/personal workspace/);
  });

  it("moves a solo user's data into the family on approval, mapping categories by name", async () => {
    const admin = await newMember('admin', { role: 'admin', status: 'active' });
    const family = await prisma.family.create({
      data: { name: 'Family', join_policy: 'approval_required' },
    });
    await prisma.member.update({
      where: { id: admin.id },
      data: { family_id: family.id },
    });
    const famGroceries = await prisma.expenseCategory.create({
      data: { name: 'Groceries', family_id: family.id },
    });

    const solo = await newMember('joiner');
    const { familyId: soloId } = await service.skipFamily(solo.id);
    const soloGroceries = await prisma.expenseCategory.findFirstOrThrow({
      where: { family_id: soloId, name: 'Groceries' },
    });
    const soloPets = await prisma.expenseCategory.create({
      data: { name: 'Pets', family_id: soloId },
    });
    await prisma.expenseEntry.create({
      data: {
        family_id: soloId,
        member_id: solo.id,
        category_id: soloGroceries.id,
        amount: 500,
        date: new Date(),
      },
    });
    await prisma.expenseEntry.create({
      data: {
        family_id: soloId,
        member_id: solo.id,
        category_id: soloPets.id,
        amount: 300,
        date: new Date(),
      },
    });
    await prisma.asset.create({
      data: {
        family_id: soloId,
        member_id: solo.id,
        type: 'bank',
        name: 'Savings',
        current_value: 1000,
      },
    });
    await addLoan(soloId, solo.id);

    const res = await service.joinFamily(solo.id, family.id);
    expect(res.status).toBe('pending_approval');
    // Nothing moves until an admin approves
    expect(await prisma.asset.count({ where: { family_id: family.id } })).toBe(
      0,
    );

    await prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: solo.id },
        data: { status: 'active' },
      });
      await service.onJoinApproved(tx, solo.id, family.id);
    });

    expect(await prisma.asset.count({ where: { family_id: family.id } })).toBe(
      1,
    );
    expect(await prisma.loan.count({ where: { family_id: family.id } })).toBe(
      1,
    );
    const expenses = await prisma.expenseEntry.findMany({
      where: { family_id: family.id },
      include: { category: true },
    });
    expect(expenses).toHaveLength(2);
    expect(
      expenses.find((e) => e.category.name === 'Groceries')?.category_id,
    ).toBe(famGroceries.id);
    expect(
      expenses.find((e) => e.category.name === 'Pets')?.category.family_id,
    ).toBe(family.id);
  });

  it('a rejected solo user returns to their own workspace with data intact', async () => {
    const family = await prisma.family.create({
      data: { name: 'Family', join_policy: 'approval_required' },
    });
    const solo = await newMember('rejected');
    const { familyId: soloId } = await service.skipFamily(solo.id);
    await prisma.asset.create({
      data: {
        family_id: soloId,
        member_id: solo.id,
        type: 'bank',
        name: 'Savings',
        current_value: 1000,
      },
    });

    await service.joinFamily(solo.id, family.id);
    await prisma.$transaction((tx) =>
      service.restoreAfterRejection(tx, solo.id),
    );

    const me = await prisma.member.findUniqueOrThrow({
      where: { id: solo.id },
    });
    expect(me).toMatchObject({
      family_id: soloId,
      status: 'active',
      role: 'admin',
    });
    expect(await prisma.asset.count({ where: { family_id: soloId } })).toBe(1);
  });

  it('removing a member deletes their contributions, keeps others, signs them out and notifies admins', async () => {
    const family = await prisma.family.create({ data: { name: 'Family' } });
    const admin = await newMember('boss', {
      family_id: family.id,
      role: 'admin',
      status: 'active',
    });
    const member = await newMember('leaver', {
      family_id: family.id,
      role: 'member',
      status: 'active',
    });
    const cat = await prisma.expenseCategory.create({
      data: { name: 'Groceries', family_id: family.id },
    });

    await prisma.asset.create({
      data: {
        family_id: family.id,
        member_id: member.id,
        type: 'bank',
        name: 'Theirs',
        current_value: 1,
      },
    });
    await prisma.asset.create({
      data: {
        family_id: family.id,
        member_id: admin.id,
        type: 'bank',
        name: 'Mine',
        current_value: 1,
      },
    });
    await prisma.expenseEntry.create({
      data: {
        family_id: family.id,
        member_id: member.id,
        category_id: cat.id,
        amount: 10,
        date: new Date(),
      },
    });
    const income = await prisma.incomeEntry.create({
      data: {
        family_id: family.id,
        member_id: member.id,
        type: 'rent',
        label: 'Rent',
        amount: 1000,
        recurrence: 'recurring_monthly',
        start_date: new Date('2026-01-01'),
      },
    });
    await prisma.monthlyIncomeReceipt.create({
      data: {
        income_id: income.id,
        family_id: family.id,
        member_id: member.id,
        year_month: '2026-02',
        scheduled_amount: 1000,
        received_amount: 1000,
        status: 'received',
      },
    });
    await addLoan(family.id, member.id);
    await prisma.refreshToken.create({
      data: {
        member_id: member.id,
        token_hash: 'h',
        expires_at: new Date(Date.now() + 86400000),
      },
    });

    const impact = await service.getRemovalImpact(family.id, member.id);
    expect(impact).toMatchObject({
      assets: 1,
      incomes: 1,
      receipts: 1,
      loans: 1,
      expenses: 1,
    });

    await expect(
      service.removeMember(admin.id, family.id, admin.id),
    ).rejects.toThrow(/yourself/);
    await service.removeMember(admin.id, family.id, member.id);

    expect(
      await prisma.asset.findMany({ where: { family_id: family.id } }),
    ).toHaveLength(1);
    expect(await prisma.loan.count({ where: { member_id: member.id } })).toBe(
      0,
    );
    expect(await prisma.repaymentInstallment.count()).toBe(0);
    expect(
      await prisma.incomeEntry.count({ where: { member_id: member.id } }),
    ).toBe(0);
    expect(await prisma.monthlyIncomeReceipt.count()).toBe(0);
    expect(
      await prisma.refreshToken.count({
        where: { member_id: member.id, revoked: false },
      }),
    ).toBe(0);
    expect(
      await prisma.member.findUniqueOrThrow({ where: { id: member.id } }),
    ).toMatchObject({ family_id: null, status: 'unaffiliated' });

    const notes = await service.listNotifications(family.id);
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toMatch(/leaver was removed/);
    expect(notes[0].message).toMatch(
      /1 asset, 1 income stream, 1 income receipt, 1 loan, 1 expense/,
    );
    await service.dismissNotification(family.id, admin.id, notes[0].id);
    expect(await service.listNotifications(family.id)).toHaveLength(0);
  });

  it('the only admin cannot leave while others remain; a member can', async () => {
    const family = await prisma.family.create({ data: { name: 'Family' } });
    const admin = await newMember('only-admin', {
      family_id: family.id,
      role: 'admin',
      status: 'active',
    });
    const member = await newMember('member', {
      family_id: family.id,
      role: 'member',
      status: 'active',
    });
    await expect(service.leaveFamily(admin.id, family.id)).rejects.toThrow(
      /only admin/,
    );
    await service.leaveFamily(member.id, family.id);
    const [note] = await service.listNotifications(family.id);
    expect(note.type).toBe('member_left');
  });
});
