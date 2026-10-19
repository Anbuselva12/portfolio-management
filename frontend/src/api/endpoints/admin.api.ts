import { api } from '../axios';

export const adminApi = {
  getPending: async () => (await api.get('/admin/members/pending')).data,
  getAllMembers: async () => (await api.get('/admin/members')).data,
  approve: async (id: string) => (await api.post(`/admin/members/${id}/approve`)).data,
  reject: async (id: string) => (await api.post(`/admin/members/${id}/reject`)).data,
  inviteMember: async (data: any) => (await api.post('/admin/members', data)).data,
  patchMember: async (id: string, data: any) => (await api.patch(`/admin/members/${id}`, data)).data,
  resetPassword: async (id: string) => (await api.post(`/admin/members/${id}/reset-password`)).data,
  removalImpact: async (id: string) => (await api.get(`/admin/members/${id}/removal-impact`)).data,
  removeMember: async (id: string) => (await api.delete(`/admin/members/${id}`)).data,
};
