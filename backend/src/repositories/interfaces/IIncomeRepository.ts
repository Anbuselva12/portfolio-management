import { IncomeEntry } from '@prisma/client';

export interface IIncomeRepository {
  /**
   * Find an income entry by ID
   */
  findById(id: string): Promise<IncomeEntry | null>;

  /**
   * Find income entries by member ID
   */
  findByMemberId(memberId: string): Promise<IncomeEntry[]>;

  /**
   * Find income entries by family ID
   */
  findByFamilyId(familyId: string): Promise<IncomeEntry[]>;

  /**
   * Create a new income entry
   */
  create(data: any): Promise<IncomeEntry>;

  /**
   * Update an existing income entry
   */
  update(id: string, data: Partial<IncomeEntry>): Promise<IncomeEntry>;

  /**
   * Stop an active income entry
   */
  stop(id: string, endDate: Date): Promise<IncomeEntry>;

  /**
   * Soft delete an income entry
   */
  softDelete(id: string): Promise<IncomeEntry>;

  /**
   * Restore a soft-deleted income entry
   */
  restore(id: string): Promise<IncomeEntry>;

  /**
   * Upsert a monthly receipt instance (recording actual amount received and date)
   */
  upsertReceipt(data: {
    income_id: string;
    family_id: string;
    member_id: string;
    year_month: string;
    scheduled_amount: any;
    received_amount: any;
    status?: string;
    received_date?: Date;
    notes?: string;
  }): Promise<any>;

  /**
   * Find all receipts for a family in a given YYYY-MM
   */
  findReceiptsByFamilyAndMonth(familyId: string, yearMonth: string): Promise<any[]>;

  /**
   * Find all receipts for a family across all months
   */
  findAllReceiptsByFamily(familyId: string): Promise<any[]>;

  /**
   * Find receipt for a specific income in a given YYYY-MM
   */
  findReceiptByIncomeAndMonth(incomeId: string, yearMonth: string): Promise<any | null>;
}

export const I_INCOME_REPOSITORY = 'IIncomeRepository';
