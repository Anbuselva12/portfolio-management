import { api } from '../axios';

export const incomeApi = {
  getAll: async () => (await api.get('/income')).data,
  create: async (data: any) => (await api.post('/income', data)).data,
  update: async (id: string, data: any) => (await api.patch(`/income/${id}`, data)).data,
  stop: async (id: string, data: any) => (await api.post(`/income/${id}/stop`, data)).data,
  remove: async (id: string) => (await api.delete(`/income/${id}`)).data,
  updateReceipt: async (receiptId: string, data: { receivedAmount?: number | string; receivedDate?: string; notes?: string }) =>
    (await api.patch(`/income/receipts/${receiptId}`, data)).data,
  revertReceipt: async (receiptId: string) => (await api.delete(`/income/receipts/${receiptId}`)).data,
  confirmReceipt: async (id: string, yearMonth: string, data: { receivedAmount: number | string; receivedDate?: string; notes?: string }) =>
    (await api.post(`/income/${id}/confirm-receipt/${yearMonth}`, data)).data,
};
