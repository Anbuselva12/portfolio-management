import { api } from '../axios';

export const assetsApi = {
  getAll: async () => (await api.get('/assets')).data,
  create: async (data: any) => (await api.post('/assets', data)).data,
  update: async (id: string, data: any) => (await api.put(`/assets/${id}`, data)).data,
  remove: async (id: string) => (await api.delete(`/assets/${id}`)).data,
};
