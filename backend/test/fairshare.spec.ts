import { describe, it, expect, beforeEach } from 'vitest';
import { FairShareService } from '../src/fairshare/fairshare.service';
import {
  LocalStorageFairShareRepository,
  LocalStorageMemberRepository,
  LocalStorageStore,
} from '../src/repositories/local-storage';

describe('FairShareService — Trip Expense Splitter & Debt Simplification Engine', () => {
  let service: FairShareService;
  let fairShareRepo: LocalStorageFairShareRepository;
  let memberRepo: LocalStorageMemberRepository;
  const creatorMemberId = 'mem_test_anbu';

  beforeEach(async () => {
    LocalStorageStore.clear();
    fairShareRepo = new LocalStorageFairShareRepository();
    memberRepo = new LocalStorageMemberRepository();

    // Create test user
    await memberRepo.create({
      id: creatorMemberId,
      username: 'anbu',
      password_hash: 'hash',
      display_name: 'Anbu',
    });

    service = new FairShareService(fairShareRepo, memberRepo);
  });

  it('creates a trip with households and participants, auto-enrolling creator', async () => {
    const trip = await service.createTrip(creatorMemberId, {
      title: 'Kodaikanal Weekend Trip',
      location: 'Kodaikanal, Tamil Nadu',
      start_date: '2026-10-10',
      end_date: '2026-10-12',
      duration_days: 3,
      currency: 'INR',
      default_split_mode: 'equal_headcount',
      settlement_level: 'family',
      households: [
        { name: 'Family 1' },
        { name: 'Family 2' },
        { name: 'Family 3' },
      ],
      participants: [
        { name: 'Participant A2', household_index: 0, is_guest: true },
        { name: 'Participant B1', household_index: 1, is_guest: true },
        { name: 'Participant B2', household_index: 1, is_guest: true },
        { name: 'Participant C1', household_index: 2, is_guest: true },
        { name: 'Participant C2', household_index: 2, is_guest: true },
      ],
    });

    expect(trip.title).toBe('Kodaikanal Weekend Trip');
    expect(trip.households.length).toBe(3);
    // 1 creator auto-enrolled in Household 0 + 5 participants = 6 total
    expect(trip.participants.length).toBe(6);
    expect(trip.participants[0].display_name).toBe('Anbu');
    expect(trip.participants[0].household_id).toBe(trip.households[0].id);
  });

  it('splits expense equally across headcount and computes balances accurately', async () => {
    const trip = await service.createTrip(creatorMemberId, {
      title: 'Ooty Holiday',
      duration_days: 2,
      households: [{ name: 'Family 1' }, { name: 'Family 2' }],
      participants: [
        { name: 'Participant A2', household_index: 0 },
        { name: 'Participant B1', household_index: 1 },
      ],
    });

    // 3 participants total: Creator (Anbu), Participant A2, Participant B1
    const anbu = trip.participants.find((p) => p.display_name === 'Anbu')!;

    // Anbu pays ₹3,000 for Tempo Traveller Van, split equally among all 3
    await service.createExpense(trip.id, {
      payer_participant_id: anbu.id,
      title: 'Tempo Traveller Van',
      amount: 3000,
      expense_date: '2026-10-10',
      day_number: 1,
      split_mode: 'equal_headcount',
    });

    const analytics = await service.getTripAnalytics(trip.id, 'individual');
    expect(analytics.totalSpend.toString()).toBe('3000');

    // Each person owes ₹1,000. Anbu paid ₹3,000 => Anbu net balance is +₹2,000
    const anbuBal = analytics.individualBalances.find((b) => b.id === anbu.id)!;
    expect(anbuBal.totalPaid.toString()).toBe('3000');
    expect(anbuBal.totalOwed.toString()).toBe('1000');
    expect(anbuBal.netBalance.toString()).toBe('2000');

    // Other two participants owe ₹1,000 each
    const others = analytics.individualBalances.filter((b) => b.id !== anbu.id);
    expect(others[0].netBalance.toString()).toBe('-1000');
    expect(others[1].netBalance.toString()).toBe('-1000');

    // Debt simplification: Exactly 2 transactions
    expect(analytics.simplifiedDebts.length).toBe(2);
    expect(analytics.simplifiedDebts.every((d) => d.toId === anbu.id)).toBe(true);
    expect(analytics.simplifiedDebts.every((d) => d.amount.toString() === '1000')).toBe(true);
  });

  it('rolls up multi-member family contributions and splits equally by household', async () => {
    // 3 families:
    // Family 1: Anbu + Participant A2
    // Family 2: Participant B1 + Participant B2
    // Family 3: Participant C1 + Participant C2
    const trip = await service.createTrip(creatorMemberId, {
      title: 'Resort Vacation',
      duration_days: 3,
      households: [
        { name: 'Family 1' },
        { name: 'Family 2' },
        { name: 'Family 3' },
      ],
      participants: [
        { name: 'Participant A2', household_index: 0 },
        { name: 'Participant B1', household_index: 1 },
        { name: 'Participant B2', household_index: 1 },
        { name: 'Participant C1', household_index: 2 },
        { name: 'Participant C2', household_index: 2 },
      ],
    });

    const anbu = trip.participants.find((p) => p.display_name === 'Anbu')!;
    const pB1 = trip.participants.find((p) => p.display_name === 'Participant B1')!;

    // Anbu (Family 1) pays ₹6,000 for Villa stay (split equally by 3 households = ₹2,000 per family)
    await service.createExpense(trip.id, {
      payer_participant_id: anbu.id,
      title: 'Villa Stay',
      amount: 6000,
      expense_date: '2026-10-10',
      day_number: 1,
      split_mode: 'equal_family',
    });

    // Participant B1 (Family 2) pays ₹3,000 for Dinner (split equally by 3 households = ₹1,000 per family)
    await service.createExpense(trip.id, {
      payer_participant_id: pB1.id,
      title: 'Dinner Party',
      amount: 3000,
      expense_date: '2026-10-10',
      day_number: 1,
      split_mode: 'equal_family',
    });

    // Total spend: ₹9,000. Each family's fair share = ₹3,000
    // Family 1: Paid ₹6,000, Owed ₹3,000 => Net: +₹3,000
    // Family 2: Paid ₹3,000, Owed ₹3,000 => Net: ₹0 (Settled!)
    // Family 3: Paid ₹0,     Owed ₹3,000 => Net: -₹3,000
    const analytics = await service.getTripAnalytics(trip.id, 'family');
    expect(analytics.totalSpend.toString()).toBe('9000');

    const f1 = analytics.householdBalances.find((b) => b.name === 'Family 1')!;
    const f2 = analytics.householdBalances.find((b) => b.name === 'Family 2')!;
    const f3 = analytics.householdBalances.find((b) => b.name === 'Family 3')!;

    expect(f1.netBalance.toString()).toBe('3000');
    expect(f2.netBalance.toString()).toBe('0');
    expect(f3.netBalance.toString()).toBe('-3000');

    // Greedy simplification should result in EXACTLY ONE transaction:
    // Family 3 pays ₹3,000 to Family 1
    expect(analytics.simplifiedDebts.length).toBe(1);
    expect(analytics.simplifiedDebts[0].fromName).toBe('Family 3');
    expect(analytics.simplifiedDebts[0].toName).toBe('Family 1');
    expect(analytics.simplifiedDebts[0].amount.toString()).toBe('3000');
  });

  it('generates a formatted WhatsApp summary with emojis and settlement plan', async () => {
    const trip = await service.createTrip(creatorMemberId, {
      title: 'Weekend Getaway',
      location: 'Yercaud',
      duration_days: 2,
      households: [{ name: 'Family 1' }, { name: 'Family 2' }],
      participants: [{ name: 'Friend B', household_index: 1 }],
    });

    const anbu = trip.participants.find((p) => p.display_name === 'Anbu')!;
    await service.createExpense(trip.id, {
      payer_participant_id: anbu.id,
      title: 'Breakfast Buffet',
      amount: 1000,
      expense_date: '2026-10-10',
      day_number: 1,
      split_mode: 'equal_headcount',
    });

    const summary = await service.generateWhatsAppSummary(trip.id, 'family');

    expect(summary).toContain('🌴 *WEEKEND GETAWAY* — Expense Summary');
    expect(summary).toContain('📍 *Location:* Yercaud');
    expect(summary).toContain('💰 *Total Trip Spend:* ₹1,000');
    expect(summary).toContain('🤝 *WHO PAYS WHOM (Simplified Settlement Plan):*');
    expect(summary).toContain('Family 2* ➔ pays *₹500* to *Family 1');
    expect(summary).toContain('• Breakfast Buffet — ₹1,000 (Paid by *Anbu*)');
  });
});

