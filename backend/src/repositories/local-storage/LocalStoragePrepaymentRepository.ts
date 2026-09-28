import { Injectable } from '@nestjs/common';
import { PrepaymentRecord, Prisma } from '@prisma/client';
import { IPrepaymentRepository } from '../interfaces';
import { LocalStorageStore } from './LocalStorageStore';

@Injectable()
export class LocalStoragePrepaymentRepository implements IPrepaymentRepository {
  private get items(): PrepaymentRecord[] {
    return LocalStorageStore.getCollection<PrepaymentRecord>('prepayment_records');
  }

  async findById(id: string): Promise<PrepaymentRecord | null> {
    const item = this.items.find((p) => p.id === id);
    return item ? { ...item } : null;
  }

  async findByLoanId(loanId: string): Promise<PrepaymentRecord[]> {
    return this.items
      .filter((p) => p.loan_id === loanId)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((p) => ({ ...p }));
  }

  async create(data: any): Promise<PrepaymentRecord> {
    const record: PrepaymentRecord = {
      id: LocalStorageStore.generateId(),
      loan_id: data.loan_id,
      amount: new Prisma.Decimal(data.amount),
      date: new Date(data.date),
      mode: data.mode,
      penalty_amount: data.penalty_amount ? new Prisma.Decimal(data.penalty_amount) : new Prisma.Decimal(0),
      accrued_interest: data.accrued_interest ? new Prisma.Decimal(data.accrued_interest) : new Prisma.Decimal(0),
      total_paid: data.total_paid ? new Prisma.Decimal(data.total_paid) : null,
      interest_saved: data.interest_saved ? new Prisma.Decimal(data.interest_saved) : new Prisma.Decimal(0),
      previous_payoff_date: data.previous_payoff_date ? new Date(data.previous_payoff_date) : null,
      new_payoff_date: data.new_payoff_date ? new Date(data.new_payoff_date) : null,
      previous_emi: data.previous_emi ? new Prisma.Decimal(data.previous_emi) : null,
      new_emi: data.new_emi ? new Prisma.Decimal(data.new_emi) : null,
      notes: data.notes || null,
      created_at: new Date(),
    };
    this.items.push(record);
    return { ...record };
  }

  async delete(id: string): Promise<void> {
    const idx = this.items.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.items.splice(idx, 1);
    }
  }
}

