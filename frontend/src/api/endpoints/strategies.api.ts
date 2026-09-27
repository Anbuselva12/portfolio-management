import { api } from '../axios';
import { StrategyComparisonResponse, SuggestionSnapshot, CustomWeights } from '../../types';

export const strategiesApi = {
  compare: async (data?: {
    surplusOverride?: string;
    prepaymentMode?: 'one_off_lump_sum' | 'recurring_monthly';
    customWeights?: Partial<CustomWeights>;
    includeAi?: boolean;
  }): Promise<StrategyComparisonResponse> =>
    (await api.post('/strategies/compare', data || {})).data,

  saveSnapshot: async (data: { strategyName: string; surplus: string; allocations: any[]; metrics: any }): Promise<SuggestionSnapshot> =>
    (await api.post('/strategies/snapshot', data)).data,

  getLatestSnapshot: async (): Promise<SuggestionSnapshot | null> =>
    (await api.get('/strategies/snapshot')).data,
};

