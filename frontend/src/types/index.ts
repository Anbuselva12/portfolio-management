export type MemberRole = 'admin' | 'member';
export type MemberStatus = 'unaffiliated' | 'pending_approval' | 'active' | 'deactivated';
export type JoinPolicy = 'open' | 'approval_required';
export type AssetType = 'bank_balance' | 'fd' | 'rd' | 'mutual_fund' | 'stocks' | 'pf' | 'nps' | 'gold' | 'real_estate' | 'other';
export type IncomeType = 'salary' | 'rent' | 'dividend' | 'interest' | 'freelance' | 'other';
export type IncomeRecurrence = 'recurring_monthly' | 'one_off';
export type IncomeStatus = 'active' | 'stopped' | 'superseded';
export type ExpenseSource = 'manual' | 'insurance_auto';
export type InsurancePolicyType = 'life' | 'health' | 'vehicle' | 'home' | 'other';
export type PremiumFrequency = 'monthly' | 'quarterly' | 'annual';
export type InsuranceStatus = 'active' | 'lapsed' | 'matured';

export type LoanType = 'home' | 'car' | 'personal' | 'jewel' | 'education' | 'business' | 'gold' | 'other';
export type InterestType = 'reducing_compound' | 'flat_simple';
export type LoanStatus = 'active' | 'paid_off' | 'defaulted';

export interface Member {
  id: string;
  familyId: string | null;
  username: string;
  displayName: string;
  role: MemberRole;
  status: MemberStatus;
  isActive: boolean;
  preferredCurrency: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Family {
  id: string;
  name: string;
  baseCurrency: string;
  country: string;
  joinPolicy: JoinPolicy;
  isDiscoverable: boolean;
  createdAt: string;
  memberCount?: number;
}

export interface Asset {
  id: string;
  memberId: string;
  familyId: string;
  type: AssetType;
  name: string;
  currency: string;
  currentValue: string;
  principalInvested: string | null;
  maturityDate: string | null;
  interestRate: string | null;
  notes: string | null;
  projectedMaturityValue: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeEntry {
  id: string;
  memberId: string;
  familyId: string;
  type: IncomeType;
  label: string;
  amount: string;
  currency: string;
  recurrence: IncomeRecurrence;
  startDate: string;
  endDate: string | null;
  status: IncomeStatus;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  familyId: string;
  name: string;
  icon: string | null;
  color: string | null;
  isActive: boolean;
}

export interface ExpenseEntry {
  id: string;
  memberId: string;
  familyId: string;
  categoryId: string;
  category?: ExpenseCategory;
  amount: string;
  currency: string;
  date: string;
  notes: string | null;
  source: ExpenseSource;
  createdAt: string;
}

export interface InsurancePolicy {
  id: string;
  memberId: string;
  familyId: string;
  policyType: InsurancePolicyType;
  provider: string;
  policyNumber: string;
  sumAssured: string;
  premiumAmount: string;
  premiumFrequency: PremiumFrequency;
  nextDueDate: string;
  linkedCategoryId: string | null;
  status: InsuranceStatus;
}

export interface Loan {
  id: string;
  memberId?: string;
  member_id?: string;
  familyId?: string;
  family_id?: string;
  name?: string;
  placeOrPurpose?: string;
  place_or_purpose?: string;
  comments?: string;
  emiRemindersEnabled?: boolean;
  emi_reminders_enabled?: boolean;
  type: LoanType;
  lender: string;
  currency: string;
  principal: string;
  interestType?: InterestType;
  interest_type?: InterestType;
  compoundingFrequency?: string;
  compounding_frequency?: string;
  interestRate?: string;
  interest_rate?: string;
  tenureMonths?: number;
  tenure_months?: number;
  startDate?: string;
  start_date?: string;
  emiAmount?: string;
  emi_amount?: string;
  userEmiInput?: string | null;
  user_emi_input?: string | null;
  emiType?: 'fixed' | 'flexible';
  emi_type?: 'fixed' | 'flexible';
  prepaymentPenaltyType?: string;
  prepayment_penalty_type?: string;
  prepaymentPenaltyValue?: string | null;
  prepayment_penalty_value?: string | null;
  countryRuleSet?: string;
  country_rule_set?: string;
  status: LoanStatus;
  discrepancyFlag?: boolean;
  discrepancy_flag?: boolean;
  discrepancyDetails?: string | null;
  discrepancy_details?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface RepaymentInstallment {
  id: string;
  loanId?: string;
  loan_id?: string;
  installmentNumber?: number;
  installment_number?: number;
  dueDate?: string;
  due_date?: string;
  openingBalance?: string;
  opening_balance?: string;
  emiAmount?: string;
  emi_amount?: string;
  principalComponent?: string;
  principal_component?: string;
  interestComponent?: string;
  interest_component?: string;
  closingBalance?: string;
  closing_balance?: string;
  isPaid?: boolean;
  is_paid?: boolean;
  paidDate?: string | null;
  paid_date?: string | null;
  isManuallyEdited?: boolean;
  is_manually_edited?: boolean;
  notes?: string | null;
}

export interface PrepaymentRecord {
  id: string;
  loanId?: string;
  loan_id?: string;
  amount: string;
  date: string;
  mode: 'reduce_tenure' | 'reduce_emi';
  penaltyAmount?: string;
  penalty_amount?: string;
  accruedInterest?: string;
  accrued_interest?: string;
  totalPaid?: string;
  total_paid?: string;
  interestSaved?: string;
  interest_saved?: string;
  previousPayoffDate?: string | null;
  previous_payoff_date?: string | null;
  newPayoffDate?: string | null;
  new_payoff_date?: string | null;
  previousEmi?: string | null;
  previous_emi?: string | null;
  newEmi?: string | null;
  new_emi?: string | null;
  notes?: string | null;
  createdAt?: string;
  created_at?: string;
}

export interface RateRevisionRecord {
  id: string;
  loanId?: string;
  loan_id?: string;
  effectiveDate: string;
  effective_date?: string;
  oldRate: string;
  old_rate?: string;
  newRate: string;
  new_rate?: string;
  policy: 'keep_emi' | 'keep_tenure';
  oldTenureMonths: number;
  old_tenure_months?: number;
  newTenureMonths: number;
  new_tenure_months?: number;
  oldEmi: string;
  old_emi?: string;
  newEmi: string;
  new_emi?: string;
  interestSaved?: string;
  interest_saved?: string;
  notes?: string | null;
  createdAt?: string;
  created_at?: string;
}

export interface RateRevisionImpact {
  oldRate: string | number;
  newRate: string | number;
  policy: 'keep_emi' | 'keep_tenure';
  oldTenureMonths: number;
  newTenureMonths: number;
  oldEmi: string | number;
  newEmi: string | number;
  tenureDiffMonths: number;
  interestSaved: string | number;
  newPayoffDate: string;
  previousPayoffDate: string;
}

export interface BrokenInterestResponse {
  days: number;
  currentOutstanding: string;
  interestRate: string;
  estimatedBrokenPeriodInterest: string;
  prevDate: string;
}

export interface DashboardSummary {
  netWorth: string;
  totalAssets: string;
  totalLiabilities: string;
  monthlyIncome: string;
  monthlyExpenses: string;
  monthlyEmi: string;
  monthlySavings: string;
  savingsRatePct: string;
  debtToIncomeRatio?: string;
  lastMonth: {
    netWorth: string;
    totalAssets: string;
    totalLiabilities: string;
    monthlyIncome: string;
    monthlyExpenses: string;
    monthlyEmi: string;
    monthlySavings: string;
    savingsRatePct: string;
  };
}

export interface DashboardAnalytics {
  assetAllocation: { type: string; value: number }[];
  liabilityBreakdown: { type: string; value: number }[];
  netWorthTrend: { month: string; netWorth: number; assets: number; liabilities: number }[];
  cashFlowTrend: { month: string; income: number; expenses: number; emi: number }[];
  payoffTimeline: {
    id: string;
    lender: string;
    type: string;
    principal: number;
    emi: number;
    startDate: string;
    payoffDate: string;
    tenureMonths: number;
  }[];
}

export interface CustomWeights {
  weightRate: number;
  weightBalance: number;
  weightFlexibility: number;
  weightPenalty: number;
  weightTenure: number;
  mode: 'cascade' | 'split';
}

export interface AllocationItem {
  loanId: string;
  name?: string;
  placeOrPurpose?: string;
  lender: string;
  type: string;
  currentPrincipal: string;
  interestRate: string;
  minimumEmi: string;
  extraAmount: string;
  totalMonthlyPayment: string;
}

export interface StrategySimulationResult {
  strategyName: 'baseline' | 'avalanche' | 'snowball' | 'custom_weighted' | 'ai_suggestion';
  title: string;
  description: string;
  monthsToDebtFree: number;
  totalInterestPaid: string;
  totalInterestSaved: string;
  payoffDate: string;
  allocations: AllocationItem[];
  timeline: {
    loanId: string;
    lender: string;
    type: string;
    payoffMonth: number;
    payoffDate: string;
  }[];
  rationale?: string;
}

export interface StrategyComparisonResponse {
  autoSurplus: string;
  activeSurplus: string;
  prepaymentMode?: 'one_off_lump_sum' | 'recurring_monthly';
  totalDebt: string;
  loanCount: number;
  baseline: StrategySimulationResult;
  strategies: StrategySimulationResult[];
}

export interface AuditLogEntry {
  id: string;
  family_id?: string | null;
  member_id?: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  field_changes?: string | null;
  timestamp: string;
  member?: {
    id: string;
    display_name: string;
    username: string;
  } | null;
}

export interface CurrencyRate {
  id: string;
  family_id: string;
  from_currency: string;
  to_currency: string;
  rate: string;
  updated_at: string;
  created_at: string;
}

export interface SuggestionSnapshot {
  id: string;
  family_id: string;
  member_id: string;
  strategy_name: string;
  surplus: string;
  allocations: string;
  metrics: string;
  created_at: string;
}
