import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loansApi } from '../../api/endpoints/loans.api';
import { Loan, LoanType } from '../../types';
import { formatINR } from '../../utils/currency';
import { SlideDrawer } from '../../components/ui/SlideDrawer';
import {
  CreditCard,
  Plus,
  Home,
  Car,
  User,
  GraduationCap,
  Briefcase,
  Coins,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Calendar,
  Percent,
} from 'lucide-react';

const LOAN_TYPES: { type: LoanType; label: string; icon: any }[] = [
  { type: 'home', label: 'Home Loan / Mortgage', icon: Home },
  { type: 'car', label: 'Car / Auto Loan', icon: Car },
  { type: 'personal', label: 'Personal Loan', icon: User },
  { type: 'education', label: 'Education Loan', icon: GraduationCap },
  { type: 'business', label: 'Business Loan', icon: Briefcase },
  { type: 'jewel', label: 'Gold / Jewel Loan', icon: Coins },
  { type: 'other', label: 'Other Loan', icon: CreditCard },
];

export const LoansPage: React.FC = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Add Loan Form State
  const [type, setType] = useState<LoanType>('home');
  const [loanName, setLoanName] = useState('');
  const [placeOrPurpose, setPlaceOrPurpose] = useState('');
  const [comments, setComments] = useState('');
  const [emiRemindersEnabled, setEmiRemindersEnabled] = useState(true);
  const [lender, setLender] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [tenureMonths, setTenureMonths] = useState<number>(120);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [userEmiInput, setUserEmiInput] = useState('');
  const [interestType, setInterestType] = useState<'reducing_compound' | 'flat_simple'>('reducing_compound');
  const [emiType, setEmiType] = useState<'fixed' | 'flexible'>('fixed');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    setIsLoading(true);
    try {
      const data = await loansApi.getAll();
      setLoans(data || []);
    } catch {
      setLoans([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lender.trim() || !principal || !interestRate || !tenureMonths) {
      setFormError('Lender, principal, rate, and tenure are required.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);

    try {
      await loansApi.create({
        type,
        name: loanName.trim() || undefined,
        placeOrPurpose: placeOrPurpose.trim() || undefined,
        comments: comments.trim() || undefined,
        emiRemindersEnabled,
        lender: lender.trim(),
        principal,
        interestRate,
        tenureMonths: Number(tenureMonths),
        startDate: new Date(startDate).toISOString(),
        userEmiInput: userEmiInput ? userEmiInput : undefined,
        interestType,
        emiType,
      });
      setIsDrawerOpen(false);
      await loadLoans();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create loan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalOutstanding = loans.reduce((sum, l) => sum + Number(l.principal || 0), 0);
  const totalMonthlyEmi = loans.reduce((sum, l) => sum + Number(l.emiAmount ?? l.emi_amount ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Family Loans & Liabilities
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Total active debt: <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">{formatINR(totalOutstanding)}</span> • Monthly EMI obligation: <span className="font-semibold text-slate-900 dark:text-white font-mono">{formatINR(totalMonthlyEmi)}/mo</span>
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setIsDrawerOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Loan</span>
        </button>
      </div>

      {/* Loans Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          Loading active loans...
        </div>
      ) : loans.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No loans recorded yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Track your home loan, car EMI, or personal debts to model reducing balances and run prepayment simulations.
          </p>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First Loan</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loans.map((loan) => {
            const typeObj = LOAN_TYPES.find((t) => t.type === loan.type);
            const Icon = typeObj?.icon || CreditCard;
            const isNearPayoff = (loan.tenureMonths || loan.tenure_months || 0) <= 3;

            const loanName = (loan as any).name || loan.lender;
            const loanPlace = (loan as any).place_or_purpose || (loan as any).placeOrPurpose;
            const emiAmountVal = loan.emiAmount ?? loan.emi_amount;
            const interestRateVal = loan.interestRate ?? loan.interest_rate;
            const tenureVal = loan.tenureMonths ?? loan.tenure_months;
            const emiTypeVal = loan.emiType ?? loan.emi_type;

            return (
              <div
                key={loan.id}
                onClick={() => navigate(`/loans/${loan.id}`)}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:border-cyan-500 dark:hover:border-cyan-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isNearPayoff && (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                          Almost there 🎉
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase">
                        {emiTypeVal}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    {loanName}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {loan.lender}
                    {loanPlace && <span className="ml-1 text-slate-400">• {loanPlace}</span>}
                  </div>
                  <div className="text-[11px] text-slate-400 capitalize mt-0.5">
                    {typeObj?.label || loan.type}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div>
                      <div className="text-[11px] text-slate-400 uppercase font-semibold">Outstanding Principal</div>
                      <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
                        {formatINR(loan.principal)}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Interest Rate:</span>
                      <span className="font-semibold text-slate-900 dark:text-white font-mono">
                        {interestRateVal}% p.a.
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Monthly EMI:</span>
                      <span className="font-bold font-mono text-slate-900 dark:text-white">
                        {formatINR(emiAmountVal)}/mo
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Tenure:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {tenureVal} months
                      </span>
                    </div>
                  </div>

                  {(loan.discrepancyFlag ?? (loan as any).discrepancy_flag) && (
                    <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Reconciled to real-world EMI</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-cyan-600 dark:text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                  <span>View Schedule & Calculator</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Loan Drawer */}
      <SlideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Add Family Loan"
      >
        <form onSubmit={handleCreateLoan} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Loan Type *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LoanType)}
              className="mt-1 block w-full px-3 py-2.5 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              {LOAN_TYPES.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Loan Name / Label
              </label>
              <input
                type="text"
                value={loanName}
                onChange={(e) => setLoanName(e.target.value)}
                placeholder="e.g. Home Loan Top Up"
                className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Place / Purpose
              </label>
              <input
                type="text"
                value={placeOrPurpose}
                onChange={(e) => setPlaceOrPurpose(e.target.value)}
                placeholder="e.g. Chennai Home"
                className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Lending Institution / Bank *
            </label>
            <input
              type="text"
              required
              value={lender}
              onChange={(e) => setLender(e.target.value)}
              placeholder="e.g. State Bank of India / HDFC Bank"
              className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Loan Amount (Principal ₹) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                placeholder="2500000"
                className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Annual Interest Rate (% p.a.) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="8.50"
                className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Tenure (Months) *
              </label>
              <input
                type="number"
                required
                min={1}
                value={tenureMonths}
                onChange={(e) => setTenureMonths(Number(e.target.value))}
                placeholder="120"
                className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                First EMI Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Your Actual Bank EMI (Optional)
              </label>
              <input
                type="number"
                step="any"
                value={userEmiInput}
                onChange={(e) => setUserEmiInput(e.target.value)}
                placeholder="Leave blank to auto-calculate"
                className="mt-1 block w-full px-3 py-1.5 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              If your bank charges a slightly different EMI due to hidden fees or day-count conventions, provide it here. Our Newton-Raphson solver will automatically calibrate your repayment schedule.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Personal Notes (optional)
            </label>
            <textarea
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Any notes about this loan..."
              className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80">
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Monthly EMI Reminder</div>
              <div className="text-[11px] text-slate-400">Auto-add this loan's EMI to Expenses every month</div>
            </div>
            <button
              type="button"
              onClick={() => setEmiRemindersEnabled(!emiRemindersEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${emiRemindersEnabled ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${emiRemindersEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Generate Loan & Schedule</span>
            </button>
          </div>
        </form>
      </SlideDrawer>
    </div>
  );
};
