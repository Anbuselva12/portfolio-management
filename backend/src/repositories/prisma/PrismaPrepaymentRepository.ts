import { Injectable } from '@nestjs/common';
import { PrepaymentRecord } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IPrepaymentRepository } from '../interfaces';

@Injectable()
export class PrismaPrepaymentRepository implements IPrepaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByLoanId(loanId: string): Promise<PrepaymentRecord[]> {
    return this.prisma.prepaymentRecord.findMany({
      where: { loan_id: loanId },
      orderBy: { date: 'asc' },
    });
  }

  async create(data: any): Promise<PrepaymentRecord> {
    return this.prisma.prepaymentRecord.create({ data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.prepaymentRecord.delete({ where: { id } });
  }
}
