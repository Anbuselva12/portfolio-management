import { Injectable } from '@nestjs/common';
import { ExpenseCategory } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IExpenseCategoryRepository } from '../interfaces';

@Injectable()
export class PrismaExpenseCategoryRepository implements IExpenseCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ExpenseCategory | null> {
    return this.prisma.expenseCategory.findUnique({ where: { id } });
  }

  async findByFamilyId(familyId: string): Promise<ExpenseCategory[]> {
    return this.prisma.expenseCategory.findMany({
      where: { family_id: familyId, is_active: true },
    });
  }

  async create(data: any): Promise<ExpenseCategory> {
    return this.prisma.expenseCategory.create({ data });
  }

  async update(id: string, data: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
    return this.prisma.expenseCategory.update({ where: { id }, data });
  }
}
