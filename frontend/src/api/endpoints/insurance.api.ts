import { api } from '../axios';
import { InsurancePolicy } from '../../types';

/** The API returns snake_case columns; the UI works with camelCase. Accepts either shape. */
export const mapPolicy = (p: any): InsurancePolicy => ({
  id: p.id,
  memberId: p.memberId ?? p.member_id,
  familyId: p.familyId ?? p.family_id,
  policyType: p.policyType ?? p.policy_type,
  provider: p.provider,
  policyNumber: p.policyNumber ?? p.policy_number ?? '',
  sumAssured: String(p.sumAssured ?? p.sum_assured ?? '0'),
  premiumAmount: String(p.premiumAmount ?? p.premium_amount ?? '0'),
  premiumFrequency: p.premiumFrequency ?? p.premium_frequency,
  nextDueDate: p.nextDueDate ?? p.next_due_date,
  linkedCategoryId: p.linkedCategoryId ?? p.linked_category_id ?? null,
  status: p.status,
});

export const insuranceApi = {
  getAll: async (): Promise<InsurancePolicy[]> => {
    const rows = (await api.get('/insurance')).data;
    return Array.isArray(rows) ? rows.map(mapPolicy) : [];
  },
  create: async (data: any) => (await api.post('/insurance', data)).data,
  update: async (id: string, data: any) => (await api.put(`/insurance/${id}`, data)).data,
  remove: async (id: string) => (await api.delete(`/insurance/${id}`)).data,
};
