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
  getGoldLoanLedger: async (loanId: string, asOfDate?: string) =>
    (await api.get(`/loans/${loanId}/ledger`, { params: asOfDate ? { asOfDate } : undefined })).data,
  addGoldLoanPayment: async (loanId: string, data: { paymentDate: string; amount: string; notes?: string }) =>
    (await api.post(`/loans/${loanId}/gold-payment`, data)).data,
  previewGoldLoanPayment: async (loanId: string, data: { paymentDate: string; amount: string }) =>
    (await api.post(`/loans/${loanId}/gold-payment/preview`, data)).data,
  deleteGoldLoanPayment: async (loanId: string, paymentId: string) =>
    (await api.delete(`/loans/${loanId}/gold-payment/${paymentId}`)).data,
  deletePrepayment: async (loanId: string, prepaymentId: string) =>
    (await api.delete(`/loans/${loanId}/prepayments/${prepaymentId}`)).data,
  deleteRateRevision: async (loanId: string, revisionId: string) =>
    (await api.delete(`/loans/${loanId}/rate-revisions/${revisionId}`)).data,
  recalculate: async (loanId: string) =>
    (await api.post(`/loans/${loanId}/recalculate`)).data,
  recalculateAll: async () =>
    (await api.post('/loans/recalculate-all')).data,
};

