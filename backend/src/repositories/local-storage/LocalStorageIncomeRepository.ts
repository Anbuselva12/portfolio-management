import { Injectable } from '@nestjs/common';
import { IncomeEntry, Prisma } from '@prisma/client';
import { IIncomeRepository } from '../interfaces';
import { LocalStorageStore } from './LocalStorageStore';

@Injectable()
export class LocalStorageIncomeRepository implements IIncomeRepository {
  private get items(): IncomeEntry[] {
    return LocalStorageStore.getCollection<IncomeEntry>('income_entries');
  }

  private get receipts(): any[] {
    return LocalStorageStore.getCollection<any>('monthly_income_receipts');
  }

  async findById(id: string): Promise<IncomeEntry | null> {
    const item = this.items.find((i) => i.id === id && i.deleted_at === null);
    return item ? { ...item } : null;
  }

  async findByMemberId(memberId: string): Promise<IncomeEntry[]> {
    return this.items.filter((i) => i.member_id === memberId && i.deleted_at === null).map((i) => ({ ...i }));
  }

  async findByFamilyId(familyId: string): Promise<IncomeEntry[]> {
    return this.items.filter((i) => i.family_id === familyId && i.deleted_at === null).map((i) => ({ ...i }));
  }

  async create(data: any): Promise<IncomeEntry> {
    const income: IncomeEntry = {
      id: LocalStorageStore.generateId(),
      member_id: data.member_id,
      family_id: data.family_id,
      type: data.type,
      label: data.label,
      amount: new Prisma.Decimal(data.amount),
      currency: data.currency || 'INR',
      recurrence: data.recurrence,
      reminders_enabled: data.reminders_enabled !== undefined ? Boolean(data.reminders_enabled) : true,
      due_day_of_month: data.due_day_of_month ? Number(data.due_day_of_month) : 1,
      start_date: new Date(data.start_date),
      end_date: data.end_date ? new Date(data.end_date) : null,
      status: data.status || 'active',
      superseded_by_id: data.superseded_by_id || null,
      last_amount_change_date: data.last_amount_change_date ? new Date(data.last_amount_change_date) : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    };
    this.items.push(income);
    return { ...income };
  }

  async update(id: string, data: Partial<IncomeEntry>): Promise<IncomeEntry> {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) throw new Error(`IncomeEntry ${id} not found`);
    const updated = {
      ...this.items[index],
      ...data,
      amount: data.amount ? new Prisma.Decimal(data.amount as any) : this.items[index].amount,
      updated_at: new Date(),
    };
    this.items[index] = updated;
    return { ...updated };
  }

  async stop(id: string, endDate: Date): Promise<IncomeEntry> {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) throw new Error(`IncomeEntry ${id} not found`);
    this.items[index].status = 'stopped';
    this.items[index].end_date = endDate;
    this.items[index].updated_at = new Date();
    return { ...this.items[index] };
  }

  async softDelete(id: string): Promise<IncomeEntry> {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) throw new Error(`IncomeEntry ${id} not found`);
    this.items[index].deleted_at = new Date();
    return { ...this.items[index] };
  }

  async restore(id: string): Promise<IncomeEntry> {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) throw new Error(`IncomeEntry ${id} not found`);
    this.items[index].deleted_at = null;
    return { ...this.items[index] };
  }

  async upsertReceipt(data: {
    income_id: string;
    family_id: string;
    member_id: string;
    year_month: string;
    scheduled_amount: any;
    received_amount: any;
    status?: string;
    received_date?: Date;
    notes?: string;
  }): Promise<any> {
    const idx = this.receipts.findIndex(
      (r) => r.income_id === data.income_id && r.year_month === data.year_month,
    );
    if (idx !== -1) {
      this.receipts[idx] = {
        ...this.receipts[idx],
        received_amount: new Prisma.Decimal(data.received_amount),
        status: data.status || 'received',
        received_date: data.received_date || new Date(),
        notes: data.notes !== undefined ? data.notes : this.receipts[idx].notes,
        updated_at: new Date(),
      };
      return { ...this.receipts[idx] };
    } else {
      const newRec = {
        id: LocalStorageStore.generateId(),
        income_id: data.income_id,
        family_id: data.family_id,
        member_id: data.member_id,
        year_month: data.year_month,
        scheduled_amount: new Prisma.Decimal(data.scheduled_amount),
        received_amount: new Prisma.Decimal(data.received_amount),
        status: data.status || 'received',
        received_date: data.received_date || new Date(),
        notes: data.notes || null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.receipts.push(newRec);
      return { ...newRec };
    }
  }

  async findReceiptsByFamilyAndMonth(familyId: string, yearMonth: string): Promise<any[]> {
    return this.receipts
      .filter((r) => r.family_id === familyId && r.year_month === yearMonth)
      .map((r) => ({ ...r }));
  }

  async findReceiptByIncomeAndMonth(incomeId: string, yearMonth: string): Promise<any | null> {
    const found = this.receipts.find(
      (r) => r.income_id === incomeId && r.year_month === yearMonth,
    );
    return found ? { ...found } : null;
  }
}

