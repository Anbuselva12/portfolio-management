import { api } from '../axios';

export const authApi = {
  login: async (data: any) => (await api.post('/auth/login', data)).data,
  register: async (data: any) => (await api.post('/auth/register', data)).data,
  logout: async () => (await api.post('/auth/logout')).data,
  refresh: async () => (await api.post('/auth/refresh')).data,
  me: async () => (await api.get('/auth/me')).data,
  changePassword: async (data: any) => (await api.post('/auth/change-password', data)).data,
};
