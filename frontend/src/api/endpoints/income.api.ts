import { api } from '../axios';

export const incomeApi = {
  getAll: async () => (await api.get('/income')).data,
  create: async (data: any) => (await api.post('/income', data)).data,
  update: async (id: string, data: any) => (await api.patch(`/income/${id}`, data)).data,
  stop: async (id: string, data: any) => (await api.post(`/income/${id}/stop`, data)).data,
  remove: async (id: string) => (await api.delete(`/income/${id}`)).data,
  confirmReceipt: async (id: string, yearMonth: string, data: { receivedAmount: number | string; receivedDate?: string; notes?: string }) =>
    (await api.post(`/income/${id}/confirm-receipt/${yearMonth}`, data)).data,
};
