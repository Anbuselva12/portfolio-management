import { Injectable } from '@nestjs/common';
import { Loan, Prisma } from '@prisma/client';
import { ILoanRepository } from '../interfaces';
import { LocalStorageStore } from './LocalStorageStore';

@Injectable()
export class LocalStorageLoanRepository implements ILoanRepository {
  private get items(): Loan[] {
    return LocalStorageStore.getCollection<Loan>('loans');
  }

  async findById(id: string): Promise<Loan | null> {
    const item = this.items.find((l) => l.id === id && l.deleted_at === null);
    return item ? { ...item } : null;
  }

  async findByFamilyId(familyId: string): Promise<Loan[]> {
    return this.items
      .filter((l) => l.family_id === familyId && l.deleted_at === null)
      .map((l) => ({ ...l }));
  }

  async findByMemberId(memberId: string): Promise<Loan[]> {
    return this.items
      .filter((l) => l.member_id === memberId && l.deleted_at === null)
      .map((l) => ({ ...l }));
  }

  async create(data: any): Promise<Loan> {
    const loan: Loan = {
      id: LocalStorageStore.generateId(),
      member_id: data.member_id,
      family_id: data.family_id,
      name: data.name || data.lender || 'Loan',
      place_or_purpose: data.place_or_purpose || null,
      comments: data.comments || null,
      emi_reminders_enabled: data.emi_reminders_enabled ?? true,
      type: data.type,
      lender: data.lender,
      currency: data.currency || 'INR',
      principal: new Prisma.Decimal(data.principal),
      interest_type: data.interest_type || 'reducing_compound',
      compounding_frequency: data.compounding_frequency || 'monthly',
      interest_rate: new Prisma.Decimal(data.interest_rate),
      tenure_months: data.tenure_months,
      start_date: new Date(data.start_date),
      emi_amount: new Prisma.Decimal(data.emi_amount),
      user_emi_input: data.user_emi_input ? new Prisma.Decimal(data.user_emi_input) : null,
      emi_type: data.emi_type || 'fixed',
      prepayment_penalty_type: data.prepayment_penalty_type || 'none',
      prepayment_penalty_value: data.prepayment_penalty_value ? new Prisma.Decimal(data.prepayment_penalty_value) : null,
      country_rule_set: data.country_rule_set || 'IN',
      status: data.status || 'active',
      discrepancy_flag: data.discrepancy_flag ?? false,
      discrepancy_details: data.discrepancy_details || null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    };
    this.items.push(loan);
    return { ...loan };
  }

  async update(id: string, data: Partial<Loan>): Promise<Loan> {
    const index = this.items.findIndex((l) => l.id === id);
    if (index === -1) throw new Error(`Loan ${id} not found`);
    const updated = {
      ...this.items[index],
      ...data,
      principal: data.principal ? new Prisma.Decimal(data.principal as any) : this.items[index].principal,
      emi_amount: data.emi_amount ? new Prisma.Decimal(data.emi_amount as any) : this.items[index].emi_amount,
      updated_at: new Date(),
    };
    this.items[index] = updated;
    return { ...updated };
  }

  async softDelete(id: string): Promise<Loan> {
    const index = this.items.findIndex((l) => l.id === id);
    if (index === -1) throw new Error(`Loan ${id} not found`);
    this.items[index].deleted_at = new Date();
    return { ...this.items[index] };
  }

  async restore(id: string): Promise<Loan> {
    const index = this.items.findIndex((l) => l.id === id);
    if (index === -1) throw new Error(`Loan ${id} not found`);
    this.items[index].deleted_at = null;
    return { ...this.items[index] };
  }
}

