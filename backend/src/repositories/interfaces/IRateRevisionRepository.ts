import { RateRevisionRecord } from '@prisma/client';

export interface IRateRevisionRepository {
  findByLoanId(loanId: string): Promise<RateRevisionRecord[]>;
  create(data: any): Promise<RateRevisionRecord>;
}

export const I_RATE_REVISION_REPOSITORY = 'IRateRevisionRepository';

