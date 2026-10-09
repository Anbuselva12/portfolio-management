import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import {
  IFairShareRepository,
  I_FAIR_SHARE_REPOSITORY,
  TripWithDetails,
  IMemberRepository,
  I_MEMBER_REPOSITORY,
} from '../repositories/interfaces';

export interface EntityBalance {
  id: string;
  name: string;
  isHousehold: boolean;
  memberCount?: number;
  totalPaid: Decimal;
  totalOwed: Decimal;
  netBalance: Decimal; // positive = to receive (creditor), negative = to pay (debtor)
}

export interface SimplifiedDebt {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: Decimal;
  isHousehold: boolean;
}

export interface TripAnalytics {
  tripId: string;
  title: string;
  currency: string;
  totalSpend: Decimal;
  activeExpensesCount: number;
  participantCount: number;
  householdCount: number;
  individualBalances: EntityBalance[];
  householdBalances: EntityBalance[];
  simplifiedDebts: SimplifiedDebt[];
  settlementLevel: string;
  isSettled: boolean;
}

@Injectable()
export class FairShareService {
  constructor(
    @Inject(I_FAIR_SHARE_REPOSITORY)
    private readonly fairShareRepo: IFairShareRepository,
    @Inject(I_MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
  ) {}

  // ─── Trips ──────────────────────────────────────────────────────────────────

  async getTrips(memberId: string) {
    return this.fairShareRepo.findTripsByMemberId(memberId);
  }

  async getTrip(tripId: string): Promise<TripWithDetails> {
    const trip = await this.fairShareRepo.findTripById(tripId);
    if (!trip) {
      throw new NotFoundException(`Trip with ID ${tripId} not found`);
    }
    return trip;
  }

  /**
   * Authorizes a member against a trip: the creator or any registered participant may access it.
   * Pass `creatorOnly` for destructive trip-level operations.
   * Non-members receive a 404 so trip IDs cannot be probed.
   */
  async assertTripAccess(tripId: string, memberId: string, creatorOnly = false): Promise<TripWithDetails> {
    const trip = await this.getTrip(tripId);
    const isCreator = trip.created_by_id === memberId;
    const isParticipant = trip.participants.some((p) => p.member_id === memberId);
    if (!isCreator && !isParticipant) {
      throw new NotFoundException(`Trip with ID ${tripId} not found`);
    }
    if (creatorOnly && !isCreator) {
      throw new ForbiddenException('Only the trip creator can perform this action');
    }
    return trip;
  }

  private assertChild(items: { id: string }[], id: string, label: string) {
    if (!items.some((item) => item.id === id)) {
      throw new NotFoundException(`${label} not found in this trip`);
    }
  }

  private pick(source: any, allowed: readonly string[]): any {
    const result: Record<string, unknown> = {};
    for (const key of allowed) {
      if (source && source[key] !== undefined) result[key] = source[key];
    }
    return result;
  }

  async createTrip(memberId: string, dto: {
    title: string;
    description?: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    duration_days?: number;
    currency?: string;
    default_split_mode?: string;
    settlement_level?: string;
    households?: { name: string; sort_order?: number }[];
    participants?: { name: string; household_index?: number; is_guest?: boolean; email?: string; phone?: string }[];
  }) {
    const creator = await this.memberRepo.findById(memberId);
    if (!creator) throw new NotFoundException('Member not found');

    const trip = await this.fairShareRepo.createTrip({
      created_by_id: memberId,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      location: dto.location?.trim() || null,
      start_date: dto.start_date ? new Date(dto.start_date) : null,
      end_date: dto.end_date ? new Date(dto.end_date) : null,
      duration_days: dto.duration_days ?? 1,
      currency: dto.currency || 'INR',
      default_split_mode: dto.default_split_mode || 'equal_headcount',
      settlement_level: dto.settlement_level || 'family',
      is_settled: false,
    });

    const householdMap = new Map<number, string>();
    if (dto.households && dto.households.length > 0) {
      for (let i = 0; i < dto.households.length; i++) {
        const h = dto.households[i];
        const createdH = await this.fairShareRepo.createHousehold({
          trip_id: trip.id,
          name: h.name.trim(),
          sort_order: h.sort_order ?? i,
        });
        householdMap.set(i, createdH.id);
      }
    }

    // Auto-create creator as a registered participant
    let creatorHouseholdId: string | null = null;
    if (householdMap.has(0)) {
      creatorHouseholdId = householdMap.get(0)!;
    }

    await this.fairShareRepo.createParticipant({
      trip_id: trip.id,
      household_id: creatorHouseholdId,
      member_id: memberId,
      display_name: creator.display_name,
      is_guest: false,
    });

    // Add additional participants if specified
    if (dto.participants && dto.participants.length > 0) {
      for (const p of dto.participants) {
        const hhId = p.household_index !== undefined ? householdMap.get(p.household_index) || null : null;
        await this.fairShareRepo.createParticipant({
          trip_id: trip.id,
          household_id: hhId,
          display_name: p.name.trim(),
          is_guest: p.is_guest ?? true,
          email: p.email?.trim() || null,
          phone: p.phone?.trim() || null,
        });
      }
    }

    return this.getTrip(trip.id);
  }

  async updateTrip(tripId: string, dto: any) {
    await this.getTrip(tripId);
    const data = this.pick(dto, [
      'title', 'description', 'location', 'duration_days', 'currency',
      'default_split_mode', 'settlement_level', 'is_settled',
    ]);
    if (dto?.start_date !== undefined) data.start_date = dto.start_date ? new Date(dto.start_date) : null;
    if (dto?.end_date !== undefined) data.end_date = dto.end_date ? new Date(dto.end_date) : null;
    return this.fairShareRepo.updateTrip(tripId, data);
  }

  async deleteTrip(tripId: string) {
    await this.getTrip(tripId);
    return this.fairShareRepo.deleteTrip(tripId);
  }

  // ─── Households ─────────────────────────────────────────────────────────────

  async addHousehold(tripId: string, dto: { name: string; sort_order?: number; default_share_pct?: number }) {
    await this.getTrip(tripId);
    return this.fairShareRepo.createHousehold({
      trip_id: tripId,
      name: dto.name.trim(),
      sort_order: dto.sort_order ?? 0,
      default_share_pct: dto.default_share_pct ?? null,
    });
  }

  async updateHousehold(tripId: string, householdId: string, dto: any) {
    const trip = await this.getTrip(tripId);
    this.assertChild(trip.households, householdId, 'Household');
    return this.fairShareRepo.updateHousehold(
      householdId,
      this.pick(dto, ['name', 'sort_order', 'default_share_pct']),
    );
  }

  async deleteHousehold(tripId: string, householdId: string) {
    const trip = await this.getTrip(tripId);
    this.assertChild(trip.households, householdId, 'Household');
    return this.fairShareRepo.deleteHousehold(householdId);
  }

  // ─── Participants ───────────────────────────────────────────────────────────

  async addParticipant(tripId: string, dto: {
    display_name: string;
    household_id?: string;
    member_id?: string;
    is_guest?: boolean;
    email?: string;
    phone?: string;
  }) {
    const trip = await this.getTrip(tripId);
    if (dto.household_id) this.assertChild(trip.households, dto.household_id, 'Household');
    return this.fairShareRepo.createParticipant({
      trip_id: tripId,
      household_id: dto.household_id || null,
      member_id: dto.member_id || null,
      display_name: dto.display_name.trim(),
      is_guest: dto.is_guest ?? true,
      email: dto.email?.trim() || null,
      phone: dto.phone?.trim() || null,
    });
  }

  async updateParticipant(tripId: string, participantId: string, dto: any) {
    const trip = await this.getTrip(tripId);
    this.assertChild(trip.participants, participantId, 'Participant');
    if (dto?.household_id) this.assertChild(trip.households, dto.household_id, 'Household');
    return this.fairShareRepo.updateParticipant(
      participantId,
      this.pick(dto, ['display_name', 'household_id', 'is_guest', 'email', 'phone']),
    );
  }

  async deleteParticipant(tripId: string, participantId: string) {
    const trip = await this.getTrip(tripId);
    this.assertChild(trip.participants, participantId, 'Participant');
    return this.fairShareRepo.deleteParticipant(participantId);
  }

  // ─── Expenses & Split Engine ────────────────────────────────────────────────

  async createExpense(tripId: string, dto: {
    payer_participant_id: string;
    title: string;
    amount: number | string;
    category?: string;
    expense_date: string;
    day_number?: number;
    notes?: string;
    split_mode: 'equal_headcount' | 'equal_family' | 'custom_percentage' | 'exact_amounts';
    participant_splits?: {
      participant_id: string;
      percentage?: number;
      amount?: number;
      is_excluded?: boolean;
    }[];
  }) {
    const trip = await this.getTrip(tripId);
    const amountDec = new Decimal(dto.amount);
    if (amountDec.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Expense amount must be greater than zero');
    }

    const payer = trip.participants.find((p) => p.id === dto.payer_participant_id);
    if (!payer) throw new BadRequestException('Payer participant not found in this trip');

    // Calculate splits
    const calculatedSplits = this.calculateSplits(trip, amountDec, dto.split_mode, dto.participant_splits);

    const expense = await this.fairShareRepo.createExpense(
      {
        trip_id: tripId,
        payer_participant_id: dto.payer_participant_id,
        title: dto.title.trim(),
        amount: amountDec.toString(),
        category: dto.category || 'general',
        expense_date: new Date(dto.expense_date),
        day_number: dto.day_number ?? 1,
        notes: dto.notes?.trim() || null,
        split_mode: dto.split_mode,
      },
      calculatedSplits,
    );

    return expense;
  }

  async updateExpense(tripId: string, expenseId: string, dto: {
    payer_participant_id?: string;
    title?: string;
    amount?: number | string;
    category?: string;
    expense_date?: string;
    day_number?: number;
    notes?: string;
    split_mode?: 'equal_headcount' | 'equal_family' | 'custom_percentage' | 'exact_amounts';
    participant_splits?: {
      participant_id: string;
      percentage?: number;
      amount?: number;
      is_excluded?: boolean;
    }[];
  }) {
    const trip = await this.getTrip(tripId);
    const existing = trip.expenses.find((e) => e.id === expenseId);
    if (!existing) throw new NotFoundException('Expense not found');

    if (dto.payer_participant_id) {
      this.assertChild(trip.participants, dto.payer_participant_id, 'Payer participant');
    }
    const amountDec = dto.amount !== undefined ? new Decimal(dto.amount) : new Decimal(existing.amount.toString());
    const splitMode = dto.split_mode || (existing.split_mode as any);

    let calculatedSplits: any[] | undefined = undefined;
    if (dto.participant_splits || dto.amount !== undefined || dto.split_mode !== undefined) {
      calculatedSplits = this.calculateSplits(trip, amountDec, splitMode, dto.participant_splits);
    }

    return this.fairShareRepo.updateExpense(
      expenseId,
      {
        ...(dto.payer_participant_id ? { payer_participant_id: dto.payer_participant_id } : {}),
        ...(dto.title ? { title: dto.title.trim() } : {}),
        ...(dto.amount !== undefined ? { amount: amountDec.toString() } : {}),
        ...(dto.category ? { category: dto.category } : {}),
        ...(dto.expense_date ? { expense_date: new Date(dto.expense_date) } : {}),
        ...(dto.day_number !== undefined ? { day_number: dto.day_number } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
        ...(dto.split_mode ? { split_mode: dto.split_mode } : {}),
      },
      calculatedSplits,
    );
  }

  async deleteExpense(tripId: string, expenseId: string) {
    const trip = await this.getTrip(tripId);
    this.assertChild(trip.expenses, expenseId, 'Expense');
    return this.fairShareRepo.deleteExpense(expenseId);
  }

  // ─── Settlements ────────────────────────────────────────────────────────────

  async recordSettlement(tripId: string, dto: {
    from_entity_id: string;
    to_entity_id: string;
    from_entity_name: string;
    to_entity_name: string;
    entity_type?: 'family' | 'individual';
    amount: number | string;
    payment_method?: 'upi' | 'cash' | 'bank_transfer';
    notes?: string;
  }) {
    await this.getTrip(tripId);
    const amountDec = new Decimal(dto.amount);
    if (amountDec.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Settlement amount must be positive');
    }

    return this.fairShareRepo.createSettlement({
      trip_id: tripId,
      from_entity_id: dto.from_entity_id,
      to_entity_id: dto.to_entity_id,
      from_entity_name: dto.from_entity_name.trim(),
      to_entity_name: dto.to_entity_name.trim(),
      entity_type: dto.entity_type || 'family',
      amount: amountDec.toString(),
      payment_method: dto.payment_method || 'upi',
      notes: dto.notes?.trim() || null,
      settled_at: new Date(),
    });
  }

  async deleteSettlement(tripId: string, settlementId: string) {
    const trip = await this.getTrip(tripId);
    this.assertChild(trip.settlements, settlementId, 'Settlement');
    return this.fairShareRepo.deleteSettlement(settlementId);
  }

  // ─── Analytics, Balances & Greedy Debt Simplification ───────────────────────

  async getTripAnalytics(tripId: string, requestedRollup?: 'family' | 'individual'): Promise<TripAnalytics> {
    const trip = await this.getTrip(tripId);
    const rollup = requestedRollup || (trip.settlement_level as 'family' | 'individual') || 'family';

    // 1. Total spend across active expenses
    let totalSpend = new Decimal(0);
    for (const exp of trip.expenses) {
      totalSpend = totalSpend.plus(new Decimal(exp.amount.toString()));
    }

    // 2. Compute individual balances
    const paidByParticipant = new Map<string, Decimal>();
    const owedByParticipant = new Map<string, Decimal>();

    for (const p of trip.participants) {
      paidByParticipant.set(p.id, new Decimal(0));
      owedByParticipant.set(p.id, new Decimal(0));
    }

    for (const exp of trip.expenses) {
      const expAmount = new Decimal(exp.amount.toString());
      const currentPaid = paidByParticipant.get(exp.payer_participant_id) || new Decimal(0);
      paidByParticipant.set(exp.payer_participant_id, currentPaid.plus(expAmount));

      for (const split of exp.splits) {
        if (!split.is_excluded) {
          const splitAmount = new Decimal(split.allocated_amount.toString());
          const currentOwed = owedByParticipant.get(split.participant_id) || new Decimal(0);
          owedByParticipant.set(split.participant_id, currentOwed.plus(splitAmount));
        }
      }
    }

    // Adjust for recorded individual settlements
    for (const s of trip.settlements) {
      if (s.entity_type === 'individual') {
        const sAmount = new Decimal(s.amount.toString());
        // from_entity paid to to_entity
        if (paidByParticipant.has(s.from_entity_id)) {
          paidByParticipant.set(s.from_entity_id, paidByParticipant.get(s.from_entity_id)!.plus(sAmount));
        }
        if (owedByParticipant.has(s.to_entity_id)) {
          owedByParticipant.set(s.to_entity_id, owedByParticipant.get(s.to_entity_id)!.plus(sAmount));
        }
      }
    }

    const individualBalances: EntityBalance[] = trip.participants.map((p) => {
      const totalPaid = paidByParticipant.get(p.id) || new Decimal(0);
      const totalOwed = owedByParticipant.get(p.id) || new Decimal(0);
      return {
        id: p.id,
        name: p.display_name,
        isHousehold: false,
        totalPaid: totalPaid.toDecimalPlaces(2),
        totalOwed: totalOwed.toDecimalPlaces(2),
        netBalance: totalPaid.minus(totalOwed).toDecimalPlaces(2),
      };
    });

    // 3. Compute household balances
    const householdBalances: EntityBalance[] = [];
    const participantsWithHousehold = new Set<string>();

    for (const h of trip.households) {
      let hPaid = new Decimal(0);
      let hOwed = new Decimal(0);
      const members = trip.participants.filter((p) => p.household_id === h.id);

      for (const m of members) {
        participantsWithHousehold.add(m.id);
        hPaid = hPaid.plus(paidByParticipant.get(m.id) || new Decimal(0));
        hOwed = hOwed.plus(owedByParticipant.get(m.id) || new Decimal(0));
      }

      // Adjust for recorded household settlements
      for (const s of trip.settlements) {
        if (s.entity_type === 'family') {
          const sAmount = new Decimal(s.amount.toString());
          if (s.from_entity_id === h.id) hPaid = hPaid.plus(sAmount);
          if (s.to_entity_id === h.id) hOwed = hOwed.plus(sAmount);
        }
      }

      householdBalances.push({
        id: h.id,
        name: h.name,
        isHousehold: true,
        memberCount: members.length,
        totalPaid: hPaid.toDecimalPlaces(2),
        totalOwed: hOwed.toDecimalPlaces(2),
        netBalance: hPaid.minus(hOwed).toDecimalPlaces(2),
      });
    }

    // Add standalone participants (no household) as their own household unit
    for (const p of trip.participants) {
      if (!participantsWithHousehold.has(p.id)) {
        const ind = individualBalances.find((i) => i.id === p.id)!;
        householdBalances.push({
          id: p.id,
          name: p.display_name,
          isHousehold: false,
          memberCount: 1,
          totalPaid: ind.totalPaid,
          totalOwed: ind.totalOwed,
          netBalance: ind.netBalance,
        });
      }
    }

    // 4. Greedy Debt Simplification
    const targetBalances = rollup === 'family' ? householdBalances : individualBalances;
    const simplifiedDebts = this.simplifyDebts(targetBalances);

    return {
      tripId: trip.id,
      title: trip.title,
      currency: trip.currency,
      totalSpend: totalSpend.toDecimalPlaces(2),
      activeExpensesCount: trip.expenses.length,
      participantCount: trip.participants.length,
      householdCount: trip.households.length,
      individualBalances,
      householdBalances,
      simplifiedDebts,
      settlementLevel: rollup,
      isSettled: simplifiedDebts.length === 0 && trip.expenses.length > 0,
    };
  }

  /**
   * Two-pointer greedy debtor-creditor matching algorithm
   * Minimizes the number of transactions to at most N - 1
   */
  private simplifyDebts(entities: EntityBalance[]): SimplifiedDebt[] {
    // Separate into debtors (net < -0.01) and creditors (net > 0.01)
    type Party = { id: string; name: string; amount: Decimal; isHousehold: boolean };
    const debtors: Party[] = [];
    const creditors: Party[] = [];

    for (const e of entities) {
      const net = e.netBalance;
      if (net.lessThan(new Decimal(-0.01))) {
        debtors.push({ id: e.id, name: e.name, amount: net.abs(), isHousehold: e.isHousehold });
      } else if (net.greaterThan(new Decimal(0.01))) {
        creditors.push({ id: e.id, name: e.name, amount: net, isHousehold: e.isHousehold });
      }
    }

    // Sort descending by amount for greedy matching
    debtors.sort((a, b) => b.amount.minus(a.amount).toNumber());
    creditors.sort((a, b) => b.amount.minus(a.amount).toNumber());

    const result: SimplifiedDebt[] = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];

      // Settle min(debtor.amount, creditor.amount)
      const settlement = Decimal.min(debtor.amount, creditor.amount).toDecimalPlaces(2);

      if (settlement.greaterThan(new Decimal(0.01))) {
        result.push({
          fromId: debtor.id,
          fromName: debtor.name,
          toId: creditor.id,
          toName: creditor.name,
          amount: settlement,
          isHousehold: debtor.isHousehold || creditor.isHousehold,
        });
      }

      debtor.amount = debtor.amount.minus(settlement);
      creditor.amount = creditor.amount.minus(settlement);

      if (debtor.amount.lessThanOrEqualTo(new Decimal(0.01))) {
        dIdx++;
      }
      if (creditor.amount.lessThanOrEqualTo(new Decimal(0.01))) {
        cIdx++;
      }
    }

    return result;
  }

  /**
   * Calculate splits with exact decimal precision and penny/paisa roundoff distribution
   */
  private calculateSplits(
    trip: TripWithDetails,
    totalAmount: Decimal,
    splitMode: 'equal_headcount' | 'equal_family' | 'custom_percentage' | 'exact_amounts',
    customSplits?: { participant_id: string; percentage?: number; amount?: number; is_excluded?: boolean }[],
  ) {
    const participants = trip.participants;
    if (participants.length === 0) {
      throw new BadRequestException('Trip has no participants');
    }

    const splits: {
      participant_id: string;
      household_id: string | null;
      allocated_amount: string;
      share_percentage?: string | null;
      is_excluded: boolean;
    }[] = [];

    // Helper map of participant -> household
    const partHouseholdMap = new Map<string, string | null>();
    participants.forEach((p) => partHouseholdMap.set(p.id, p.household_id || null));

    if (splitMode === 'equal_headcount') {
      const excludedIds = new Set(
        customSplits?.filter((cs) => cs.is_excluded).map((cs) => cs.participant_id) || [],
      );
      const activeParticipants = participants.filter((p) => !excludedIds.has(p.id));

      if (activeParticipants.length === 0) {
        throw new BadRequestException('At least one participant must be included in the split');
      }

      const count = activeParticipants.length;
      const baseShare = totalAmount.dividedBy(count).toDecimalPlaces(2, Decimal.ROUND_DOWN);
      let remainder = totalAmount.minus(baseShare.times(count));

      for (const p of participants) {
        if (excludedIds.has(p.id)) {
          splits.push({
            participant_id: p.id,
            household_id: partHouseholdMap.get(p.id) || null,
            allocated_amount: '0.00',
            share_percentage: '0.00',
            is_excluded: true,
          });
        } else {
          let share = baseShare;
          if (remainder.greaterThan(0)) {
            share = share.plus(new Decimal('0.01'));
            remainder = remainder.minus(new Decimal('0.01'));
          }
          const pct = totalAmount.isZero() ? new Decimal(0) : share.dividedBy(totalAmount).times(100);
          splits.push({
            participant_id: p.id,
            household_id: partHouseholdMap.get(p.id) || null,
            allocated_amount: share.toFixed(2),
            share_percentage: pct.toFixed(2),
            is_excluded: false,
          });
        }
      }
    } else if (splitMode === 'equal_family') {
      // Split equally across participating households (and standalone participants)
      const households = trip.households;
      const standaloneParticipants = participants.filter((p) => !p.household_id);

      const totalUnits = households.length + standaloneParticipants.length;
      if (totalUnits === 0) {
        throw new BadRequestException('No households or participants available for family split');
      }

      const perUnitBase = totalAmount.dividedBy(totalUnits).toDecimalPlaces(2, Decimal.ROUND_DOWN);
      let remainder = totalAmount.minus(perUnitBase.times(totalUnits));

      // 1. Households
      for (const h of households) {
        let hShare = perUnitBase;
        if (remainder.greaterThan(0)) {
          hShare = hShare.plus(new Decimal('0.01'));
          remainder = remainder.minus(new Decimal('0.01'));
        }

        const members = participants.filter((p) => p.household_id === h.id);
        if (members.length === 0) {
          continue;
        }

        // Divide household share among its members
        const perMember = hShare.dividedBy(members.length).toDecimalPlaces(2, Decimal.ROUND_DOWN);
        let mRemainder = hShare.minus(perMember.times(members.length));

        for (const m of members) {
          let mShare = perMember;
          if (mRemainder.greaterThan(0)) {
            mShare = mShare.plus(new Decimal('0.01'));
            mRemainder = mRemainder.minus(new Decimal('0.01'));
          }
          splits.push({
            participant_id: m.id,
            household_id: h.id,
            allocated_amount: mShare.toFixed(2),
            share_percentage: totalAmount.isZero() ? '0.00' : mShare.dividedBy(totalAmount).times(100).toFixed(2),
            is_excluded: false,
          });
        }
      }

      // 2. Standalone participants
      for (const p of standaloneParticipants) {
        let pShare = perUnitBase;
        if (remainder.greaterThan(0)) {
          pShare = pShare.plus(new Decimal('0.01'));
          remainder = remainder.minus(new Decimal('0.01'));
        }
        splits.push({
          participant_id: p.id,
          household_id: null,
          allocated_amount: pShare.toFixed(2),
          share_percentage: totalAmount.isZero() ? '0.00' : pShare.dividedBy(totalAmount).times(100).toFixed(2),
          is_excluded: false,
        });
      }
    } else if (splitMode === 'custom_percentage') {
      if (!customSplits || customSplits.length === 0) {
        throw new BadRequestException('Custom percentage splits required');
      }

      let totalPct = new Decimal(0);
      for (const cs of customSplits) {
        if (!cs.is_excluded && cs.percentage) {
          totalPct = totalPct.plus(new Decimal(cs.percentage));
        }
      }

      if (totalPct.minus(100).abs().greaterThan(new Decimal(0.1))) {
        throw new BadRequestException(`Split percentages must sum to 100% (currently ${totalPct}%)`);
      }

      let distributedAmount = new Decimal(0);
      const splitItems: typeof splits = [];

      for (const p of participants) {
        const cs = customSplits.find((c) => c.participant_id === p.id);
        if (!cs || cs.is_excluded || !cs.percentage) {
          splitItems.push({
            participant_id: p.id,
            household_id: partHouseholdMap.get(p.id) || null,
            allocated_amount: '0.00',
            share_percentage: '0.00',
            is_excluded: true,
          });
        } else {
          const pct = new Decimal(cs.percentage);
          const share = totalAmount.times(pct).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_DOWN);
          distributedAmount = distributedAmount.plus(share);
          splitItems.push({
            participant_id: p.id,
            household_id: partHouseholdMap.get(p.id) || null,
            allocated_amount: share.toFixed(2),
            share_percentage: pct.toFixed(2),
            is_excluded: false,
          });
        }
      }

      // Distribute any penny/paisa roundoff to the largest active contributor
      let remainder = totalAmount.minus(distributedAmount);
      if (remainder.greaterThan(0)) {
        const activeItem = splitItems.find((s) => !s.is_excluded);
        if (activeItem) {
          activeItem.allocated_amount = new Decimal(activeItem.allocated_amount).plus(remainder).toFixed(2);
        }
      }

      splits.push(...splitItems);
    } else if (splitMode === 'exact_amounts') {
      if (!customSplits || customSplits.length === 0) {
        throw new BadRequestException('Exact amount splits required');
      }

      let totalAssigned = new Decimal(0);
      for (const p of participants) {
        const cs = customSplits.find((c) => c.participant_id === p.id);
        if (!cs || cs.is_excluded || !cs.amount) {
          splits.push({
            participant_id: p.id,
            household_id: partHouseholdMap.get(p.id) || null,
            allocated_amount: '0.00',
            share_percentage: '0.00',
            is_excluded: true,
          });
        } else {
          const share = new Decimal(cs.amount).toDecimalPlaces(2);
          totalAssigned = totalAssigned.plus(share);
          const pct = totalAmount.isZero() ? new Decimal(0) : share.dividedBy(totalAmount).times(100);
          splits.push({
            participant_id: p.id,
            household_id: partHouseholdMap.get(p.id) || null,
            allocated_amount: share.toFixed(2),
            share_percentage: pct.toFixed(2),
            is_excluded: false,
          });
        }
      }

      if (totalAssigned.minus(totalAmount).abs().greaterThan(new Decimal(0.01))) {
        throw new BadRequestException(
          `Sum of split amounts (${totalAssigned}) does not match expense total (${totalAmount})`,
        );
      }
    }

    return splits;
  }

  // ─── WhatsApp Summary Generator ─────────────────────────────────────────────

  async generateWhatsAppSummary(tripId: string, rollup: 'family' | 'individual' = 'family'): Promise<string> {
    const trip = await this.getTrip(tripId);
    const analytics = await this.getTripAnalytics(tripId, rollup);

    const currencySymbol = trip.currency === 'INR' ? '₹' : trip.currency;
    const formatMoney = (val: Decimal | number | string) => {
      const num = new Decimal(val).toNumber();
      return `${currencySymbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    };

    const lines: string[] = [];
    lines.push(`🌴 *${trip.title.toUpperCase()}* — Expense Summary`);
    if (trip.location) lines.push(`📍 *Location:* ${trip.location}`);
    if (trip.start_date) {
      const startStr = new Date(trip.start_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      const endStr = trip.end_date
        ? new Date(trip.end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
        : '';
      lines.push(`📅 *Duration:* ${startStr} ${endStr ? `– ${endStr}` : ''} (${trip.duration_days} Days)`);
    }
    lines.push(`💰 *Total Trip Spend:* ${formatMoney(analytics.totalSpend)}`);
    lines.push(`👥 *Participants:* ${trip.participants.length} | *Households:* ${trip.households.length}`);
    lines.push(``);

    // Net Balances
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📊 *NET BALANCES (${rollup === 'family' ? 'Household / Family View' : 'Individual View'}):*`);
    const balances = rollup === 'family' ? analytics.householdBalances : analytics.individualBalances;

    for (const b of balances) {
      const net = b.netBalance;
      if (net.greaterThan(new Decimal(0.01))) {
        lines.push(`• *${b.name}:* +${formatMoney(net)} ✅ (To Receive)`);
      } else if (net.lessThan(new Decimal(-0.01))) {
        lines.push(`• *${b.name}:* -${formatMoney(net.abs())} 🔴 (To Pay)`);
      } else {
        lines.push(`• *${b.name}:* ${formatMoney(0)} ⚪ (Settled)`);
      }
    }
    lines.push(``);

    // Settlement Plan (Who Pays Whom)
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`🤝 *WHO PAYS WHOM (Simplified Settlement Plan):*`);
    if (analytics.simplifiedDebts.length === 0) {
      lines.push(`🎉 *All expenses are fully settled! No payments pending.*`);
    } else {
      analytics.simplifiedDebts.forEach((debt, index) => {
        lines.push(`${index + 1}. *${debt.fromName}* ➔ pays *${formatMoney(debt.amount)}* to *${debt.toName}*`);
      });
    }
    lines.push(``);

    // Day-by-day Expenses Log
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📝 *ITEMIZED EXPENSE LOG:*`);

    // Group expenses by day_number or date
    const sortedExpenses = [...trip.expenses].sort(
      (a, b) => new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime(),
    );

    const expensesByDay = new Map<number, typeof sortedExpenses>();
    for (const exp of sortedExpenses) {
      const day = exp.day_number || 1;
      if (!expensesByDay.has(day)) expensesByDay.set(day, []);
      expensesByDay.get(day)!.push(exp);
    }

    const dayKeys = Array.from(expensesByDay.keys()).sort((a, b) => a - b);
    for (const day of dayKeys) {
      lines.push(`*Day ${day}:*`);
      const dayExpenses = expensesByDay.get(day)!;
      for (const exp of dayExpenses) {
        const expAmount = formatMoney(exp.amount.toString());
        lines.push(`  • ${exp.title} — ${expAmount} (Paid by *${exp.payer.display_name}*)`);
      }
    }

    lines.push(``);
    lines.push(`_Generated via FairShare • FinFamily Ecosystem_`);

    return lines.join('\n');
  }
}

