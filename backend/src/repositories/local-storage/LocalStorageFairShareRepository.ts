import { Injectable } from '@nestjs/common';
import {
  FairShareTrip,
  FairShareHousehold,
  FairShareParticipant,
  FairShareExpense,
  FairShareExpenseSplit,
  FairShareSettlement,
  Prisma,
} from '@prisma/client';
import { IFairShareRepository, TripWithDetails } from '../interfaces';
import { LocalStorageStore } from './LocalStorageStore';
import { randomUUID } from 'crypto';

@Injectable()
export class LocalStorageFairShareRepository implements IFairShareRepository {
  private get trips(): FairShareTrip[] {
    return LocalStorageStore.getCollection<FairShareTrip>('fairshare_trips');
  }

  private get households(): FairShareHousehold[] {
    return LocalStorageStore.getCollection<FairShareHousehold>('fairshare_households');
  }

  private get participants(): FairShareParticipant[] {
    return LocalStorageStore.getCollection<FairShareParticipant>('fairshare_participants');
  }

  private get expenses(): FairShareExpense[] {
    return LocalStorageStore.getCollection<FairShareExpense>('fairshare_expenses');
  }

  private get splits(): FairShareExpenseSplit[] {
    return LocalStorageStore.getCollection<FairShareExpenseSplit>('fairshare_expense_splits');
  }

  private get settlements(): FairShareSettlement[] {
    return LocalStorageStore.getCollection<FairShareSettlement>('fairshare_settlements');
  }

  // ─── Trips ──────────────────────────────────────────────────────────────────

  async findTripsByMemberId(memberId: string): Promise<FairShareTrip[]> {
    const memberTripIds = new Set(
      this.participants.filter((p) => p.member_id === memberId).map((p) => p.trip_id),
    );

    return this.trips
      .filter((t) => t.created_by_id === memberId || memberTripIds.has(t.id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((t) => {
        const tripHouseholds = this.households
          .filter((h) => h.trip_id === t.id)
          .map((h) => ({
            ...h,
            participants: this.participants.filter((p) => p.household_id === h.id),
          }));
        const tripParticipants = this.participants.filter((p) => p.trip_id === t.id);
        const tripExpenses = this.expenses.filter((e) => e.trip_id === t.id && e.is_active);

        return {
          ...t,
          households: tripHouseholds,
          participants: tripParticipants,
          expenses: tripExpenses,
        } as any;
      });
  }

  async findTripById(id: string): Promise<TripWithDetails | null> {
    const t = this.trips.find((trip) => trip.id === id);
    if (!t) return null;

    const creatorMember = LocalStorageStore.getCollection<any>('members').find(
      (m: any) => m.id === t.created_by_id,
    );

    const tripHouseholds = this.households
      .filter((h) => h.trip_id === id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((h) => ({
        ...h,
        participants: this.participants.filter((p) => p.household_id === h.id),
      }));

    const tripParticipants = this.participants
      .filter((p) => p.trip_id === id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((p) => ({
        ...p,
        household: this.households.find((h) => h.id === p.household_id) || null,
      }));

    const tripExpenses = this.expenses
      .filter((e) => e.trip_id === id && e.is_active)
      .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime())
      .map((e) => {
        const payer = this.participants.find((p) => p.id === e.payer_participant_id)!;
        const expenseSplits = this.splits
          .filter((s) => s.expense_id === e.id)
          .map((s) => ({
            ...s,
            participant: this.participants.find((p) => p.id === s.participant_id)!,
            household: s.household_id ? this.households.find((h) => h.id === s.household_id) || null : null,
          }));

        return {
          ...e,
          payer,
          splits: expenseSplits,
        };
      });

    const tripSettlements = this.settlements
      .filter((s) => s.trip_id === id)
      .sort((a, b) => new Date(b.settled_at).getTime() - new Date(a.settled_at).getTime());

    return {
      ...t,
      creator: creatorMember
        ? { id: creatorMember.id, display_name: creatorMember.display_name, username: creatorMember.username }
        : undefined,
      households: tripHouseholds,
      participants: tripParticipants,
      expenses: tripExpenses,
      settlements: tripSettlements,
    } as TripWithDetails;
  }

  async createTrip(data: any): Promise<FairShareTrip> {
    const list = this.trips;
    const now = new Date();
    const newTrip: FairShareTrip = {
      id: data.id || randomUUID(),
      created_by_id: data.created_by_id,
      title: data.title,
      description: data.description || null,
      location: data.location || null,
      start_date: data.start_date ? new Date(data.start_date) : null,
      end_date: data.end_date ? new Date(data.end_date) : null,
      duration_days: data.duration_days ?? 1,
      currency: data.currency || 'INR',
      default_split_mode: data.default_split_mode || 'equal_headcount',
      settlement_level: data.settlement_level || 'family',
      is_settled: data.is_settled ?? false,
      created_at: now,
      updated_at: now,
    };
    list.push(newTrip);
    LocalStorageStore.setCollection('fairshare_trips', list);
    return newTrip;
  }

  async updateTrip(id: string, data: Partial<FairShareTrip>): Promise<FairShareTrip> {
    const list = this.trips;
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Trip not found');

    const updated = {
      ...list[idx],
      ...data,
      updated_at: new Date(),
    };
    list[idx] = updated;
    LocalStorageStore.setCollection('fairshare_trips', list);
    return updated;
  }

  async deleteTrip(id: string): Promise<void> {
    const list = this.trips.filter((t) => t.id !== id);
    LocalStorageStore.setCollection('fairshare_trips', list);

    // Cascades
    LocalStorageStore.setCollection(
      'fairshare_households',
      this.households.filter((h) => h.trip_id !== id),
    );
    LocalStorageStore.setCollection(
      'fairshare_participants',
      this.participants.filter((p) => p.trip_id !== id),
    );
    const deletedExpenseIds = new Set(this.expenses.filter((e) => e.trip_id === id).map((e) => e.id));
    LocalStorageStore.setCollection(
      'fairshare_expenses',
      this.expenses.filter((e) => e.trip_id !== id),
    );
    LocalStorageStore.setCollection(
      'fairshare_expense_splits',
      this.splits.filter((s) => !deletedExpenseIds.has(s.expense_id)),
    );
    LocalStorageStore.setCollection(
      'fairshare_settlements',
      this.settlements.filter((s) => s.trip_id !== id),
    );
  }

  // ─── Households ─────────────────────────────────────────────────────────────

  async findHouseholdsByTripId(tripId: string): Promise<FairShareHousehold[]> {
    return this.households
      .filter((h) => h.trip_id === tripId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((h) => ({
        ...h,
        participants: this.participants.filter((p) => p.household_id === h.id),
      })) as any;
  }

  async createHousehold(data: any): Promise<FairShareHousehold> {
    const list = this.households;
    const item: FairShareHousehold = {
      id: data.id || randomUUID(),
      trip_id: data.trip_id,
      name: data.name,
      sort_order: data.sort_order ?? 0,
      default_share_pct: data.default_share_pct ? new Prisma.Decimal(data.default_share_pct) : null,
      created_at: new Date(),
    };
    list.push(item);
    LocalStorageStore.setCollection('fairshare_households', list);
    return item;
  }

  async updateHousehold(id: string, data: Partial<FairShareHousehold>): Promise<FairShareHousehold> {
    const list = this.households;
    const idx = list.findIndex((h) => h.id === id);
    if (idx === -1) throw new Error('Household not found');
    const updated = {
      ...list[idx],
      ...data,
      default_share_pct:
        data.default_share_pct !== undefined
          ? data.default_share_pct
            ? new Prisma.Decimal(data.default_share_pct)
            : null
          : list[idx].default_share_pct,
    };
    list[idx] = updated;
    LocalStorageStore.setCollection('fairshare_households', list);
    return updated;
  }

  async deleteHousehold(id: string): Promise<void> {
    LocalStorageStore.setCollection(
      'fairshare_households',
      this.households.filter((h) => h.id !== id),
    );
    // Nullify household_id on participants
    const parts = this.participants.map((p) => (p.household_id === id ? { ...p, household_id: null } : p));
    LocalStorageStore.setCollection('fairshare_participants', parts);
  }

  // ─── Participants ───────────────────────────────────────────────────────────

  async findParticipantsByTripId(tripId: string): Promise<FairShareParticipant[]> {
    return this.participants
      .filter((p) => p.trip_id === tripId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((p) => ({
        ...p,
        household: this.households.find((h) => h.id === p.household_id) || null,
      })) as any;
  }

  async createParticipant(data: any): Promise<FairShareParticipant> {
    const list = this.participants;
    const item: FairShareParticipant = {
      id: data.id || randomUUID(),
      trip_id: data.trip_id,
      household_id: data.household_id || null,
      member_id: data.member_id || null,
      display_name: data.display_name,
      is_guest: data.is_guest ?? true,
      email: data.email || null,
      phone: data.phone || null,
      created_at: new Date(),
    };
    list.push(item);
    LocalStorageStore.setCollection('fairshare_participants', list);
    return item;
  }

  async updateParticipant(id: string, data: Partial<FairShareParticipant>): Promise<FairShareParticipant> {
    const list = this.participants;
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Participant not found');
    const updated = { ...list[idx], ...data };
    list[idx] = updated;
    LocalStorageStore.setCollection('fairshare_participants', list);
    return updated;
  }

  async deleteParticipant(id: string): Promise<void> {
    LocalStorageStore.setCollection(
      'fairshare_participants',
      this.participants.filter((p) => p.id !== id),
    );
  }

  // ─── Expenses ───────────────────────────────────────────────────────────────

  async findExpensesByTripId(tripId: string): Promise<FairShareExpense[]> {
    return this.expenses
      .filter((e) => e.trip_id === tripId && e.is_active)
      .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime())
      .map((e) => ({
        ...e,
        payer: this.participants.find((p) => p.id === e.payer_participant_id)!,
        splits: this.splits
          .filter((s) => s.expense_id === e.id)
          .map((s) => ({
            ...s,
            participant: this.participants.find((p) => p.id === s.participant_id)!,
            household: s.household_id ? this.households.find((h) => h.id === s.household_id) || null : null,
          })),
      })) as any;
  }

  async findExpenseById(id: string): Promise<FairShareExpense | null> {
    const e = this.expenses.find((exp) => exp.id === id);
    if (!e) return null;
    return {
      ...e,
      payer: this.participants.find((p) => p.id === e.payer_participant_id)!,
      splits: this.splits
        .filter((s) => s.expense_id === e.id)
        .map((s) => ({
          ...s,
          participant: this.participants.find((p) => p.id === s.participant_id)!,
          household: s.household_id ? this.households.find((h) => h.id === s.household_id) || null : null,
        })),
    } as any;
  }

  async createExpense(data: any, splitsData: any[]): Promise<FairShareExpense> {
    const list = this.expenses;
    const splitsList = this.splits;
    const now = new Date();
    const expenseId = data.id || randomUUID();

    const item: FairShareExpense = {
      id: expenseId,
      trip_id: data.trip_id,
      payer_participant_id: data.payer_participant_id,
      title: data.title,
      amount: new Prisma.Decimal(data.amount),
      category: data.category || 'general',
      expense_date: new Date(data.expense_date),
      day_number: data.day_number ?? 1,
      notes: data.notes || null,
      split_mode: data.split_mode || 'equal_headcount',
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    list.push(item);
    LocalStorageStore.setCollection('fairshare_expenses', list);

    if (splitsData && splitsData.length > 0) {
      for (const s of splitsData) {
        const splitItem: FairShareExpenseSplit = {
          id: randomUUID(),
          expense_id: expenseId,
          participant_id: s.participant_id,
          household_id: s.household_id || null,
          allocated_amount: new Prisma.Decimal(s.allocated_amount),
          share_percentage: s.share_percentage ? new Prisma.Decimal(s.share_percentage) : null,
          is_excluded: s.is_excluded ?? false,
          created_at: now,
        };
        splitsList.push(splitItem);
      }
      LocalStorageStore.setCollection('fairshare_expense_splits', splitsList);
    }

    return this.findExpenseById(expenseId) as any;
  }

  async updateExpense(id: string, data: any, splitsData?: any[]): Promise<FairShareExpense> {
    const list = this.expenses;
    const idx = list.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('Expense not found');

    const updated: FairShareExpense = {
      ...list[idx],
      ...data,
      amount: data.amount ? new Prisma.Decimal(data.amount) : list[idx].amount,
      expense_date: data.expense_date ? new Date(data.expense_date) : list[idx].expense_date,
      updated_at: new Date(),
    };
    list[idx] = updated;
    LocalStorageStore.setCollection('fairshare_expenses', list);

    if (splitsData) {
      const remainingSplits = this.splits.filter((s) => s.expense_id !== id);
      const now = new Date();
      for (const s of splitsData) {
        remainingSplits.push({
          id: randomUUID(),
          expense_id: id,
          participant_id: s.participant_id,
          household_id: s.household_id || null,
          allocated_amount: new Prisma.Decimal(s.allocated_amount),
          share_percentage: s.share_percentage ? new Prisma.Decimal(s.share_percentage) : null,
          is_excluded: s.is_excluded ?? false,
          created_at: now,
        });
      }
      LocalStorageStore.setCollection('fairshare_expense_splits', remainingSplits);
    }

    return this.findExpenseById(id) as any;
  }

  async deleteExpense(id: string): Promise<void> {
    const list = this.expenses;
    const idx = list.findIndex((e) => e.id === id);
    if (idx !== -1) {
      list[idx].is_active = false;
      list[idx].updated_at = new Date();
      LocalStorageStore.setCollection('fairshare_expenses', list);
    }
  }

  // ─── Settlements ────────────────────────────────────────────────────────────

  async findSettlementsByTripId(tripId: string): Promise<FairShareSettlement[]> {
    return this.settlements
      .filter((s) => s.trip_id === tripId)
      .sort((a, b) => new Date(b.settled_at).getTime() - new Date(a.settled_at).getTime());
  }

  async createSettlement(data: any): Promise<FairShareSettlement> {
    const list = this.settlements;
    const item: FairShareSettlement = {
      id: data.id || randomUUID(),
      trip_id: data.trip_id,
      from_entity_id: data.from_entity_id,
      to_entity_id: data.to_entity_id,
      from_entity_name: data.from_entity_name,
      to_entity_name: data.to_entity_name,
      entity_type: data.entity_type || 'family',
      amount: new Prisma.Decimal(data.amount),
      payment_method: data.payment_method || 'upi',
      notes: data.notes || null,
      settled_at: data.settled_at ? new Date(data.settled_at) : new Date(),
    };
    list.push(item);
    LocalStorageStore.setCollection('fairshare_settlements', list);
    return item;
  }

  async deleteSettlement(id: string): Promise<void> {
    LocalStorageStore.setCollection(
      'fairshare_settlements',
      this.settlements.filter((s) => s.id !== id),
    );
  }
}

