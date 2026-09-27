import { Injectable } from '@nestjs/common';
import { RepaymentInstallment, Prisma } from '@prisma/client';
import { IRepaymentScheduleRepository } from '../interfaces';
import { LocalStorageStore } from './LocalStorageStore';

@Injectable()
export class LocalStorageRepaymentScheduleRepository implements IRepaymentScheduleRepository {
  private get items(): RepaymentInstallment[] {
    return LocalStorageStore.getCollection<RepaymentInstallment>('repayment_installments');
  }

  async findByLoanId(loanId: string): Promise<RepaymentInstallment[]> {
    return this.items
      .filter((r) => r.loan_id === loanId)
      .sort((a, b) => a.installment_number - b.installment_number)
      .map((r) => ({ ...r }));
  }

  async findById(id: string): Promise<RepaymentInstallment | null> {
    const item = this.items.find((r) => r.id === id);
    return item ? { ...item } : null;
  }

  async createMany(installments: any[]): Promise<void> {
    for (const inst of installments) {
      const item: RepaymentInstallment = {
        id: inst.id || LocalStorageStore.generateId(),
        loan_id: inst.loan_id,
        installment_number: inst.installment_number,
        due_date: new Date(inst.due_date),
        opening_balance: new Prisma.Decimal(inst.opening_balance),
        emi_amount: new Prisma.Decimal(inst.emi_amount),
        principal_component: new Prisma.Decimal(inst.principal_component),
        interest_component: new Prisma.Decimal(inst.interest_component),
        closing_balance: new Prisma.Decimal(inst.closing_balance),
        is_paid: inst.is_paid ?? false,
        paid_date: inst.paid_date ? new Date(inst.paid_date) : null,
        is_manually_edited: inst.is_manually_edited ?? false,
        notes: inst.notes || null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.items.push(item);
    }
  }

  async update(id: string, data: Partial<RepaymentInstallment>): Promise<RepaymentInstallment> {
    const index = this.items.findIndex((r) => r.id === id);
    if (index === -1) throw new Error(`Installment ${id} not found`);
    const updated = {
      ...this.items[index],
      ...data,
      opening_balance: data.opening_balance ? new Prisma.Decimal(data.opening_balance as any) : this.items[index].opening_balance,
      emi_amount: data.emi_amount ? new Prisma.Decimal(data.emi_amount as any) : this.items[index].emi_amount,
      principal_component: data.principal_component ? new Prisma.Decimal(data.principal_component as any) : this.items[index].principal_component,
      interest_component: data.interest_component ? new Prisma.Decimal(data.interest_component as any) : this.items[index].interest_component,
      closing_balance: data.closing_balance ? new Prisma.Decimal(data.closing_balance as any) : this.items[index].closing_balance,
      updated_at: new Date(),
    };
    this.items[index] = updated;
    return { ...updated };
  }

  async deleteFutureInstallments(loanId: string, fromInstallmentNumber: number): Promise<void> {
    const list = this.items;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].loan_id === loanId && list[i].installment_number >= fromInstallmentNumber) {
        list.splice(i, 1);
      }
    }
  }

  async deleteAllForLoan(loanId: string): Promise<void> {
    const list = this.items;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].loan_id === loanId) {
        list.splice(i, 1);
      }
    }
  }
}

