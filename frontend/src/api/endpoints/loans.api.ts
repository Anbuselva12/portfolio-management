import { api } from '../axios';

export const loansApi = {
  getAll: async (memberId?: string) => (await api.get('/loans', { params: memberId ? { memberId } : undefined })).data,
  getById: async (id: string) => (await api.get(`/loans/${id}`)).data,
  create: async (data: any) => (await api.post('/loans', data)).data,
  update: async (id: string, data: any) => (await api.patch(`/loans/${id}`, data)).data,
  remove: async (id: string) => (await api.delete(`/loans/${id}`)).data,
  getSchedule: async (id: string) => (await api.get(`/loans/${id}/schedule`)).data,
  updateInstallment: async (loanId: string, installmentId: string, data: any) =>
    (await api.patch(`/loans/${loanId}/schedule/${installmentId}`, data)).data,
  getPrepayments: async (loanId: string) => (await api.get(`/loans/${loanId}/prepayments`)).data,
  getBrokenInterest: async (loanId: string, date: string) =>
    (await api.get(`/loans/${loanId}/prepayments/broken-interest`, { params: { date } })).data,
  previewPrepayment: async (loanId: string, data: any) =>
    (await api.post(`/loans/${loanId}/prepayments/preview`, data)).data,
  applyPrepayment: async (loanId: string, data: any) =>
    (await api.post(`/loans/${loanId}/prepayments/apply`, data)).data,
  getRateRevisions: async (loanId: string) => (await api.get(`/loans/${loanId}/rate-revisions`)).data,
  previewRateRevision: async (loanId: string, data: any) =>
    (await api.post(`/loans/${loanId}/rate-revisions/preview`, data)).data,
  applyRateRevision: async (loanId: string, data: any) =>
    (await api.post(`/loans/${loanId}/rate-revisions/apply`, data)).data,
  calibrate: async (loanId: string, data: any) =>
    (await api.post(`/loans/${loanId}/calibrate`, data)).data,
};

