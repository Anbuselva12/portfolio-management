import { ExpenseCategory } from '@prisma/client';

export interface IExpenseCategoryRepository {
  /**
   * Find a category by ID
   */
  findById(id: string): Promise<ExpenseCategory | null>;

  /**
   * Find categories by family ID
   */
  findByFamilyId(familyId: string): Promise<ExpenseCategory[]>;

  /**
   * Create a new category
   */
  create(data: any): Promise<ExpenseCategory>;

  /**
   * Update an existing category (e.g., disable it)
   */
  update(id: string, data: Partial<ExpenseCategory>): Promise<ExpenseCategory>;
}

export const I_EXPENSE_CATEGORY_REPOSITORY = 'IExpenseCategoryRepository';
