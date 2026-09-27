import { api } from '../axios';

export const expensesApi = {
  getCategories: async () => (await api.get('/expense-categories')).data,
  createCategory: async (data: any) => (await api.post('/expense-categories', data)).data,
  updateCategory: async (id: string, data: any) => (await api.patch(`/expense-categories/${id}`, data)).data,
  getAll: async (month?: string) => (await api.get('/expenses', { params: month ? { month } : undefined })).data,
  create: async (data: any) => (await api.post('/expenses', data)).data,
  update: async (id: string, data: any) => (await api.patch(`/expenses/${id}`, data)).data,
  markEmiPaid: async (id: string, isPaid: boolean) => (await api.patch(`/expenses/${id}/mark-paid`, { isPaid })).data,
  remove: async (id: string) => (await api.delete(`/expenses/${id}`)).data,
};
