import { api } from '../axios';

export const dashboardApi = {
  getSummary: async (scope?: string) => (await api.get('/dashboard/summary', { params: scope ? { scope } : undefined })).data,
  getAnalytics: async (scope?: string) => (await api.get('/dashboard/analytics', { params: scope ? { scope } : undefined })).data,
  getReminders: async (scope?: string, month?: string) =>
    (await api.get('/dashboard/reminders', { params: { ...(scope ? { scope } : {}), ...(month ? { month } : {}) } })).data,
};
