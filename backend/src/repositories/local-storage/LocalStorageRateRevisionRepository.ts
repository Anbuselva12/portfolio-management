import { Injectable } from '@nestjs/common';
import { RateRevisionRecord, Prisma } from '@prisma/client';
import { IRateRevisionRepository } from '../interfaces';
import { LocalStorageStore } from './LocalStorageStore';

@Injectable()
export class LocalStorageRateRevisionRepository implements IRateRevisionRepository {
  private get items(): RateRevisionRecord[] {
    return LocalStorageStore.getCollection<RateRevisionRecord>('rate_revision_records');
  }

  async findById(id: string): Promise<RateRevisionRecord | null> {
    const item = this.items.find((r) => r.id === id);
    return item ? { ...item } : null;
  }

  async findByLoanId(loanId: string): Promise<RateRevisionRecord[]> {
    return this.items
      .filter((r) => r.loan_id === loanId)
      .sort((a, b) => a.effective_date.getTime() - b.effective_date.getTime())
      .map((r) => ({ ...r }));
  }

  async create(data: any): Promise<RateRevisionRecord> {
    const record: RateRevisionRecord = {
      id: LocalStorageStore.generateId(),
      loan_id: data.loan_id,
      effective_date: new Date(data.effective_date),
      old_rate: new Prisma.Decimal(data.old_rate),
      new_rate: new Prisma.Decimal(data.new_rate),
      policy: data.policy,
      old_tenure_months: data.old_tenure_months,
      new_tenure_months: data.new_tenure_months,
      old_emi: new Prisma.Decimal(data.old_emi),
      new_emi: new Prisma.Decimal(data.new_emi),
      interest_saved: data.interest_saved ? new Prisma.Decimal(data.interest_saved) : new Prisma.Decimal(0),
      notes: data.notes || null,
      created_at: new Date(),
    };
    this.items.push(record);
    return { ...record };
  }

  async delete(id: string): Promise<void> {
    const idx = this.items.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.items.splice(idx, 1);
    }
  }
}

