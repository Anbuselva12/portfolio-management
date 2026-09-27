import { Injectable } from '@nestjs/common';
import { RateRevisionRecord } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IRateRevisionRepository } from '../interfaces';

@Injectable()
export class PrismaRateRevisionRepository implements IRateRevisionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByLoanId(loanId: string): Promise<RateRevisionRecord[]> {
    return this.prisma.rateRevisionRecord.findMany({
      where: { loan_id: loanId },
      orderBy: { effective_date: 'asc' },
    });
  }

  async create(data: any): Promise<RateRevisionRecord> {
    return this.prisma.rateRevisionRecord.create({ data });
  }
}

