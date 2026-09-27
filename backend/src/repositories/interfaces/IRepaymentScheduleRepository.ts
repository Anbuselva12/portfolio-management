import { RepaymentInstallment } from '@prisma/client';

export interface IRepaymentScheduleRepository {
  findByLoanId(loanId: string): Promise<RepaymentInstallment[]>;
  findById(id: string): Promise<RepaymentInstallment | null>;
  createMany(installments: any[]): Promise<void>;
  update(id: string, data: Partial<RepaymentInstallment>): Promise<RepaymentInstallment>;
  deleteFutureInstallments(loanId: string, fromInstallmentNumber: number): Promise<void>;
  deleteAllForLoan(loanId: string): Promise<void>;
}

export const I_REPAYMENT_SCHEDULE_REPOSITORY = 'IRepaymentScheduleRepository';

