import { api } from '../axios';
import { Asset } from '../../types';

/** The API returns snake_case columns; the UI works with camelCase. Accepts either shape. */
export const mapAsset = (a: any): Asset => ({
  id: a.id,
  memberId: a.memberId ?? a.member_id,
  familyId: a.familyId ?? a.family_id,
  type: a.type,
  name: a.name,
  currency: a.currency,
  currentValue: String(a.currentValue ?? a.current_value ?? '0'),
  principalInvested: a.principalInvested ?? a.principal_invested ?? null,
  maturityDate: a.maturityDate ?? a.maturity_date ?? null,
  interestRate: a.interestRate ?? a.interest_rate ?? null,
  notes: a.notes ?? null,
  projectedMaturityValue: a.projectedMaturityValue ?? a.projected_maturity_value ?? null,
  createdAt: a.createdAt ?? a.created_at,
  updatedAt: a.updatedAt ?? a.updated_at,
});

export const assetsApi = {
  getAll: async (): Promise<Asset[]> => {
    const rows = (await api.get('/assets')).data;
    return Array.isArray(rows) ? rows.map(mapAsset) : [];
  },
  create: async (data: any) => mapAsset((await api.post('/assets', data)).data),
  update: async (id: string, data: any) => mapAsset((await api.put(`/assets/${id}`, data)).data),
  remove: async (id: string) => (await api.delete(`/assets/${id}`)).data,
};
