import { Injectable } from '@nestjs/common';
import { Loan } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ILoanRepository } from '../interfaces';

@Injectable()
export class PrismaLoanRepository implements ILoanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Loan | null> {
    return this.prisma.loan.findFirst({
      where: { id, deleted_at: null },
    });
  }

  async findByFamilyId(familyId: string): Promise<Loan[]> {
    return this.prisma.loan.findMany({
      where: { family_id: familyId, deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
  }

  async findByMemberId(memberId: string): Promise<Loan[]> {
    return this.prisma.loan.findMany({
      where: { member_id: memberId, deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(data: any): Promise<Loan> {
    return this.prisma.loan.create({ data });
  }

  async update(id: string, data: Partial<Loan>): Promise<Loan> {
    return this.prisma.loan.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<Loan> {
    return this.prisma.loan.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async restore(id: string): Promise<Loan> {
    return this.prisma.loan.update({
      where: { id },
      data: { deleted_at: null },
    });
  }
}

