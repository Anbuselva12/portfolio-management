import { Loan } from '@prisma/client';

export interface ILoanRepository {
  findById(id: string): Promise<Loan | null>;
  findByFamilyId(familyId: string): Promise<Loan[]>;
  findByMemberId(memberId: string): Promise<Loan[]>;
  create(data: any): Promise<Loan>;
  update(id: string, data: Partial<Loan>): Promise<Loan>;
  softDelete(id: string): Promise<Loan>;
  restore(id: string): Promise<Loan>;
}

export const I_LOAN_REPOSITORY = 'ILoanRepository';

