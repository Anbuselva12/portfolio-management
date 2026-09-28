import { RateRevisionRecord } from '@prisma/client';

export interface IRateRevisionRepository {
  findById(id: string): Promise<RateRevisionRecord | null>;
  findByLoanId(loanId: string): Promise<RateRevisionRecord[]>;
  create(data: any): Promise<RateRevisionRecord>;
  delete(id: string): Promise<void>;
}

export const I_RATE_REVISION_REPOSITORY = 'IRateRevisionRepository';
