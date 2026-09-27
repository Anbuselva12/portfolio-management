import { api } from '../axios';

export const insuranceApi = {
  getAll: async () => (await api.get('/insurance')).data,
  create: async (data: any) => (await api.post('/insurance', data)).data,
  update: async (id: string, data: any) => (await api.put(`/insurance/${id}`, data)).data,
  remove: async (id: string) => (await api.delete(`/insurance/${id}`)).data,
};
