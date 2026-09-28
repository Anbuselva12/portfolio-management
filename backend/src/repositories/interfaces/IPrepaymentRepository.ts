import { PrepaymentRecord } from '@prisma/client';

export interface IPrepaymentRepository {
  findByLoanId(loanId: string): Promise<PrepaymentRecord[]>;
  create(data: any): Promise<PrepaymentRecord>;
  delete?(id: string): Promise<void>;
}

export const I_PREPAYMENT_REPOSITORY = 'IPrepaymentRepository';
