import { Injectable } from '@nestjs/common';
import { ExpenseEntry, Prisma } from '@prisma/client';
import { IExpenseRepository } from '../interfaces';
import { LocalStorageStore } from './LocalStorageStore';

@Injectable()
export class LocalStorageExpenseRepository implements IExpenseRepository {
  private get items(): ExpenseEntry[] {
    return LocalStorageStore.getCollection<ExpenseEntry>('expense_entries');
  }

  async findById(id: string): Promise<ExpenseEntry | null> {
    const item = this.items.find((e) => e.id === id && e.deleted_at === null);
    return item ? { ...item } : null;
  }

  async findByMemberId(memberId: string): Promise<ExpenseEntry[]> {
    return this.items.filter((e) => e.member_id === memberId && e.deleted_at === null).map((e) => ({ ...e }));
  }

  async findByFamilyId(familyId: string): Promise<ExpenseEntry[]> {
    return this.items.filter((e) => e.family_id === familyId && e.deleted_at === null).map((e) => ({ ...e }));
  }

  async findByMonth(familyId: string, year: number, month: number): Promise<ExpenseEntry[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    return this.items
      .filter((e) => e.family_id === familyId && e.deleted_at === null && e.date >= startDate && e.date <= endDate)
      .map((e) => ({ ...e }));
  }

  async create(data: any): Promise<ExpenseEntry> {
    const expense: ExpenseEntry = {
      id: LocalStorageStore.generateId(),
      member_id: data.member_id,
      family_id: data.family_id,
      category_id: data.category_id,
      amount: new Prisma.Decimal(data.amount),
      currency: data.currency || 'INR',
      date: new Date(data.date),
      notes: data.notes || null,
      source: data.source || 'manual',
      loan_id: data.loan_id || null,
      installment_id: data.installment_id || null,
      is_paid: data.is_paid ?? true,
      is_recurring: data.is_recurring ?? false,
      reminders_enabled: data.reminders_enabled ?? true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    };
    this.items.push(expense);
    return { ...expense };
  }

  async update(id: string, data: Partial<ExpenseEntry>): Promise<ExpenseEntry> {
    const index = this.items.findIndex((e) => e.id === id);
    if (index === -1) throw new Error(`ExpenseEntry ${id} not found`);
    const updated = {
      ...this.items[index],
      ...data,
      amount: data.amount ? new Prisma.Decimal(data.amount as any) : this.items[index].amount,
      updated_at: new Date(),
    };
    this.items[index] = updated;
    return { ...updated };
  }

  async findByInstallmentId(installmentId: string): Promise<ExpenseEntry[]> {
    return this.items
      .filter((e) => e.installment_id === installmentId && e.deleted_at === null)
      .map((e) => ({ ...e }));
  }

  async findByLoanId(loanId: string): Promise<ExpenseEntry[]> {
    return this.items
      .filter((e) => e.loan_id === loanId && e.source === 'loan_emi_auto' && e.deleted_at === null)
      .map((e) => ({ ...e }));
  }

  async softDelete(id: string): Promise<ExpenseEntry> {
    const index = this.items.findIndex((e) => e.id === id);
    if (index === -1) throw new Error(`ExpenseEntry ${id} not found`);
    this.items[index].deleted_at = new Date();
    return { ...this.items[index] };
  }

  async restore(id: string): Promise<ExpenseEntry> {
    const index = this.items.findIndex((e) => e.id === id);
    if (index === -1) throw new Error(`ExpenseEntry ${id} not found`);
    this.items[index].deleted_at = null;
    return { ...this.items[index] };
  }
}

