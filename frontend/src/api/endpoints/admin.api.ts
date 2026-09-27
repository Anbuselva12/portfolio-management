import { api } from '../axios';

export const adminApi = {
  getPending: async () => (await api.get('/admin/pending')).data,
  approve: async (id: string) => (await api.post(`/admin/approve/${id}`)).data,
  reject: async (id: string) => (await api.post(`/admin/reject/${id}`)).data,
  inviteMember: async (data: any) => (await api.post('/admin/invite', data)).data,
  patchMember: async (id: string, data: any) => (await api.patch(`/admin/member/${id}`, data)).data,
  resetPassword: async (id: string) => (await api.post(`/admin/member/${id}/reset-password`)).data,
};
