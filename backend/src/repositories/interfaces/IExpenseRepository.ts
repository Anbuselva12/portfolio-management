import { ExpenseEntry } from '@prisma/client';

export interface IExpenseRepository {
  /**
   * Find an expense entry by ID
   */
  findById(id: string): Promise<ExpenseEntry | null>;

  /**
   * Find expense entries by member ID
   */
  findByMemberId(memberId: string): Promise<ExpenseEntry[]>;

  /**
   * Find expense entries by family ID
   */
  findByFamilyId(familyId: string): Promise<ExpenseEntry[]>;

  /**
   * Find expense entries by family ID for a specific month
   */
  findByMonth(familyId: string, year: number, month: number): Promise<ExpenseEntry[]>;

  /**
   * Create a new expense entry
   */
  create(data: any): Promise<ExpenseEntry>;

  /**
   * Update an existing expense entry
   */
  update(id: string, data: Partial<ExpenseEntry>): Promise<ExpenseEntry>;

  /**
   * Find expense entries linked to a specific installment
   */
  findByInstallmentId(installmentId: string): Promise<ExpenseEntry[]>;

  /**
   * Find expense entries linked to a specific loan (loan_emi_auto)
   */
  findByLoanId(loanId: string): Promise<ExpenseEntry[]>;

  /**
   * Soft delete an expense entry
   */
  softDelete(id: string): Promise<ExpenseEntry>;

  /**
   * Restore a soft-deleted expense entry
   */
  restore(id: string): Promise<ExpenseEntry>;
}

export const I_EXPENSE_REPOSITORY = 'IExpenseRepository';
