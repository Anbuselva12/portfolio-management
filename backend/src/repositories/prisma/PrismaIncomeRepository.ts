import { Injectable } from '@nestjs/common';
import { IncomeEntry } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IIncomeRepository } from '../interfaces';

@Injectable()
export class PrismaIncomeRepository implements IIncomeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<IncomeEntry | null> {
    return this.prisma.incomeEntry.findFirst({
      where: { id, deleted_at: null },
    });
  }

  async findByMemberId(memberId: string): Promise<IncomeEntry[]> {
    return this.prisma.incomeEntry.findMany({
      where: { member_id: memberId, deleted_at: null },
    });
  }

  async findByFamilyId(familyId: string): Promise<IncomeEntry[]> {
    return this.prisma.incomeEntry.findMany({
      where: { family_id: familyId, deleted_at: null },
    });
  }

  async create(data: any): Promise<IncomeEntry> {
    return this.prisma.incomeEntry.create({ data });
  }

  async update(id: string, data: Partial<IncomeEntry>): Promise<IncomeEntry> {
    return this.prisma.incomeEntry.update({ where: { id }, data });
  }

  async stop(id: string, endDate: Date): Promise<IncomeEntry> {
    return this.prisma.incomeEntry.update({
      where: { id },
      data: { status: 'stopped', end_date: endDate },
    });
  }

  async softDelete(id: string): Promise<IncomeEntry> {
    return this.prisma.incomeEntry.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async restore(id: string): Promise<IncomeEntry> {
    return this.prisma.incomeEntry.update({
      where: { id },
      data: { deleted_at: null },
    });
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
    return (this.prisma as any).monthlyIncomeReceipt.upsert({
      where: {
        income_id_year_month: {
          income_id: data.income_id,
          year_month: data.year_month,
        },
      },
      create: {
        income_id: data.income_id,
        family_id: data.family_id,
        member_id: data.member_id,
        year_month: data.year_month,
        scheduled_amount: data.scheduled_amount,
        received_amount: data.received_amount,
        status: data.status || 'received',
        received_date: data.received_date || new Date(),
        notes: data.notes || null,
      },
      update: {
        received_amount: data.received_amount,
        status: data.status || 'received',
        received_date: data.received_date || new Date(),
        notes: data.notes !== undefined ? data.notes : undefined,
      },
    });
  }

  async findReceiptsByFamilyAndMonth(familyId: string, yearMonth: string): Promise<any[]> {
    return (this.prisma as any).monthlyIncomeReceipt.findMany({
      where: { family_id: familyId, year_month: yearMonth },
    });
  }

  async findReceiptByIncomeAndMonth(incomeId: string, yearMonth: string): Promise<any | null> {
    return (this.prisma as any).monthlyIncomeReceipt.findUnique({
      where: {
        income_id_year_month: {
          income_id: incomeId,
          year_month: yearMonth,
        },
      },
    });
  }
}
