import { Injectable } from '@nestjs/common';
import { RepaymentInstallment } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IRepaymentScheduleRepository } from '../interfaces';

@Injectable()
export class PrismaRepaymentScheduleRepository implements IRepaymentScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByLoanId(loanId: string): Promise<RepaymentInstallment[]> {
    return this.prisma.repaymentInstallment.findMany({
      where: { loan_id: loanId },
      orderBy: { installment_number: 'asc' },
    });
  }

  async findById(id: string): Promise<RepaymentInstallment | null> {
    return this.prisma.repaymentInstallment.findUnique({
      where: { id },
    });
  }

  async createMany(installments: any[]): Promise<void> {
    await this.prisma.repaymentInstallment.createMany({
      data: installments,
    });
  }

  async update(id: string, data: Partial<RepaymentInstallment>): Promise<RepaymentInstallment> {
    return this.prisma.repaymentInstallment.update({
      where: { id },
      data,
    });
  }

  async deleteFutureInstallments(loanId: string, fromInstallmentNumber: number): Promise<void> {
    await this.prisma.repaymentInstallment.deleteMany({
      where: {
        loan_id: loanId,
        installment_number: { gte: fromInstallmentNumber },
      },
    });
  }

  async deleteAllForLoan(loanId: string): Promise<void> {
    await this.prisma.repaymentInstallment.deleteMany({
      where: { loan_id: loanId },
    });
  }
}

