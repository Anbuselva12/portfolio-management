import { create } from 'zustand';
import { Asset, IncomeEntry, ExpenseEntry, ExpenseCategory, InsurancePolicy, DashboardSummary } from '../types';

interface PortfolioState {
  assets: Asset[];
  income: IncomeEntry[];
  expenses: ExpenseEntry[];
  expenseCategories: ExpenseCategory[];
  insurance: InsurancePolicy[];
  summary: DashboardSummary | null;
  setAssets: (assets: Asset[]) => void;
  setIncome: (income: IncomeEntry[]) => void;
  setExpenses: (expenses: ExpenseEntry[]) => void;
  setExpenseCategories: (cats: ExpenseCategory[]) => void;
  setInsurance: (insurance: InsurancePolicy[]) => void;
  setSummary: (summary: DashboardSummary) => void;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  assets: [],
  income: [],
  expenses: [],
  expenseCategories: [],
  insurance: [],
  summary: null,
  setAssets: (assets) => set({ assets }),
  setIncome: (income) => set({ income }),
  setExpenses: (expenses) => set({ expenses }),
  setExpenseCategories: (cats) => set({ expenseCategories: cats }),
  setInsurance: (insurance) => set({ insurance }),
  setSummary: (summary) => set({ summary }),
}));
