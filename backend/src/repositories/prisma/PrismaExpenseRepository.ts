import { Injectable } from '@nestjs/common';
import { ExpenseEntry } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IExpenseRepository } from '../interfaces';

@Injectable()
export class PrismaExpenseRepository implements IExpenseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ExpenseEntry | null> {
    return this.prisma.expenseEntry.findFirst({
      where: { id, deleted_at: null },
    });
  }

  async findByMemberId(memberId: string): Promise<ExpenseEntry[]> {
    return this.prisma.expenseEntry.findMany({
      where: { member_id: memberId, deleted_at: null },
    });
  }

  async findByFamilyId(familyId: string): Promise<ExpenseEntry[]> {
    return this.prisma.expenseEntry.findMany({
      where: { family_id: familyId, deleted_at: null },
    });
  }

  async findByMonth(familyId: string, year: number, month: number): Promise<ExpenseEntry[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    return this.prisma.expenseEntry.findMany({
      where: {
        family_id: familyId,
        date: { gte: startDate, lte: endDate },
        deleted_at: null,
      },
    });
  }

  async create(data: any): Promise<ExpenseEntry> {
    return this.prisma.expenseEntry.create({ data });
  }

  async update(id: string, data: Partial<ExpenseEntry>): Promise<ExpenseEntry> {
    return this.prisma.expenseEntry.update({ where: { id }, data });
  }

  async findByInstallmentId(installmentId: string): Promise<ExpenseEntry[]> {
    return this.prisma.expenseEntry.findMany({
      where: { installment_id: installmentId, deleted_at: null },
    });
  }

  async findByLoanId(loanId: string): Promise<ExpenseEntry[]> {
    return this.prisma.expenseEntry.findMany({
      where: { loan_id: loanId, source: 'loan_emi_auto', deleted_at: null },
    });
  }

  async softDelete(id: string): Promise<ExpenseEntry> {
    return this.prisma.expenseEntry.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async restore(id: string): Promise<ExpenseEntry> {
    return this.prisma.expenseEntry.update({
      where: { id },
      data: { deleted_at: null },
    });
  }
}
