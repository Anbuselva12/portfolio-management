import { api } from '../axios';

export const familyApi = {
  getDiscoverable: async () => (await api.get('/families/discoverable')).data,
  create: async (data: any) => (await api.post('/families', data)).data,
  createFamily: async (data: any) => (await api.post('/families', data)).data,
  join: async (id: string) => (await api.post(`/families/${id}/join`)).data,
  joinFamily: async (id: string) => (await api.post(`/families/${id}/join`)).data,
  getCurrent: async () => (await api.get('/families/current')).data,
  /** Skip family setup and continue in a private solo workspace. */
  skip: async () => (await api.post('/families/skip')).data,
  /** Turn the solo workspace into a family; data stays. */
  convert: async (data: any) => (await api.post('/families/current/convert', data)).data,
  leaveImpact: async () => (await api.get('/families/current/leave-impact')).data,
  leave: async () => (await api.post('/families/current/leave')).data,
  getNotifications: async () => (await api.get('/families/notifications')).data,
  dismissNotification: async (id: string) => (await api.post(`/families/notifications/${id}/dismiss`)).data,
  updateSettings: async (data: any) => (await api.patch('/families/current/settings', data)).data,
  getCurrencyRates: async () => (await api.get('/families/currency-rates')).data,
  upsertCurrencyRate: async (data: { fromCurrency: string; toCurrency: string; rate: any }) =>
    (await api.put('/families/currency-rates', data)).data,
  deleteCurrencyRate: async (id: string) => (await api.delete(`/families/currency-rates/${id}`)).data,
};
