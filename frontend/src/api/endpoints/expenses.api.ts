import { api } from '../axios';
import { ExpenseEntry } from '../../types';

/** The API returns snake_case columns; the UI works with camelCase. Accepts either shape. */
export const mapExpense = (e: any): ExpenseEntry => ({
  id: e.id,
  memberId: e.memberId ?? e.member_id,
  familyId: e.familyId ?? e.family_id,
  categoryId: e.categoryId ?? e.category_id,
  amount: String(e.amount ?? '0'),
  currency: e.currency,
  date: e.date,
  notes: e.notes ?? null,
  source: e.source,
  loanId: e.loanId ?? e.loan_id ?? null,
  isPaid: Boolean(e.isPaid ?? e.is_paid),
  createdAt: e.createdAt ?? e.created_at,
});

export const expensesApi = {
  getCategories: async () => (await api.get('/expense-categories')).data,
  createCategory: async (data: any) => (await api.post('/expense-categories', data)).data,
  updateCategory: async (id: string, data: any) => (await api.patch(`/expense-categories/${id}`, data)).data,
  getAll: async (month?: string): Promise<ExpenseEntry[]> => {
    const rows = (await api.get('/expenses', { params: month ? { month } : undefined })).data;
    return Array.isArray(rows) ? rows.map(mapExpense) : [];
  },
  create: async (data: any) => (await api.post('/expenses', data)).data,
  update: async (id: string, data: any) => (await api.patch(`/expenses/${id}`, data)).data,
  markEmiPaid: async (id: string, isPaid: boolean) => (await api.patch(`/expenses/${id}/mark-paid`, { isPaid })).data,
  remove: async (id: string) => (await api.delete(`/expenses/${id}`)).data,
};
