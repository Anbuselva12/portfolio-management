import { PrepaymentRecord } from '@prisma/client';

export interface IPrepaymentRepository {
  findByLoanId(loanId: string): Promise<PrepaymentRecord[]>;
  create(data: any): Promise<PrepaymentRecord>;
}

export const I_PREPAYMENT_REPOSITORY = 'IPrepaymentRepository';

