import { api } from '../axios';

export interface TransactionsQuery {
  duration?: '1m' | '3m' | 'quarterly' | '1y' | 'yearly' | 'all';
  startDate?: string;
  endDate?: string;
  flow?: 'all' | 'inflow' | 'outflow';
  source?: 'all' | 'income' | 'expense' | 'loan';
  memberId?: string;
  /** `all` (default), `untagged`, or a project id. */
  projectId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TransactionItem {
  id: string;
  date: string;
  direction: 'inflow' | 'outflow';
  type:
    | 'income_one_off'
    | 'income_recurring'
    | 'expense_household'
    | 'expense_insurance'
    | 'loan_emi'
    | 'loan_prepayment'
    | 'gold_loan_payment';
  title: string;
  subtitle: string;
  amount: string;
  currency: string;
  convertedAmount: string;
  memberId: string;
  memberName: string;
  source: 'income' | 'expense' | 'loan';
  rawEntityId: string;
  projects: Array<{ id: string; name: string }>;
  /** Source edited by the Tag action; null when the row cannot be tagged. */
  tagTarget: { kind: 'income' | 'loan'; id: string } | null;
}

export interface TransactionsResponse {
  summary: {
    totalInflow: string;
    totalOutflow: string;
    netCashFlow: string;
    transactionCount: number;
    baseCurrency: string;
  };
  transactions: TransactionItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const transactionsApi = {
  getTransactions: async (params?: TransactionsQuery): Promise<TransactionsResponse> =>
    (await api.get('/transactions', { params })).data,
};
