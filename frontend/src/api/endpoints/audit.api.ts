import { api } from '../axios';
import { AuditLogEntry } from '../../types';

export interface AuditQueryParams {
  memberId?: string;
  entityType?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

export const auditApi = {
  getLogs: async (params?: AuditQueryParams): Promise<AuditLogEntry[]> =>
    (await api.get('/audit', { params })).data,

  restore: async (entityType: string, id: string): Promise<{ success: boolean; message: string }> =>
    (await api.post(`/audit/restore/${entityType}/${id}`)).data,
};

