import { api } from '../axios';

export const familyApi = {
  getDiscoverable: async () => (await api.get('/families/discoverable')).data,
  create: async (data: any) => (await api.post('/families', data)).data,
  createFamily: async (data: any) => (await api.post('/families', data)).data,
  join: async (id: string) => (await api.post(`/families/${id}/join`)).data,
  joinFamily: async (id: string) => (await api.post(`/families/${id}/join`)).data,
  getCurrent: async () => (await api.get('/families/current')).data,
  updateSettings: async (data: any) => (await api.patch('/families/current/settings', data)).data,
  getCurrencyRates: async () => (await api.get('/families/currency-rates')).data,
  upsertCurrencyRate: async (data: { fromCurrency: string; toCurrency: string; rate: any }) =>
    (await api.put('/families/currency-rates', data)).data,
  deleteCurrencyRate: async (id: string) => (await api.delete(`/families/currency-rates/${id}`)).data,
};
