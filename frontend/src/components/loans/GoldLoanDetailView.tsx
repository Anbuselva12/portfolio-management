import React, { useState, useMemo } from 'react';
import { Loan, PrepaymentRecord } from '../../types';
import { formatINR } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { loansApi } from '../../api/endpoints/loans.api';
import { GoldLoanCalculator, GoldLoanInput } from '../../utils/gold-loan.calculator';
import {
  Sparkles,
  Calendar,
  Percent,
  PlusCircle,
  Trash2,
  TrendingDown,
  History,
  FileText,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Clock,
  ArrowLeft,
  Edit2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface GoldLoanDetailViewProps {
  loan: Loan;
  prepayments: PrepaymentRecord[];
  onRefresh: () => Promise<void>;
  onEditTerms: () => void;
  onDeleteLoan: () => void;
  onBack: () => void;
}

export const GoldLoanDetailView: React.FC<GoldLoanDetailViewProps> = ({
  loan,
  prepayments,
  onRefresh,
  onEditTerms,
  onDeleteLoan,
  onBack,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [asOfDate, setAsOfDate] = useState<string>(todayStr);

  // New Payment Form State
  const [payDate, setPayDate] = useState<string>(todayStr);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  // Payoff Quote State
  const [quoteDate, setQuoteDate] = useState<string>('');
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [isCalculatingQuote, setIsCalculatingQuote] = useState<boolean>(false);

  // Prepare input for shared calculator
  const calculatorInput: GoldLoanInput = useMemo(() => {
    const pAmt = Number(loan.principal);
    const rPct = Number(loan.interestRate || loan.interest_rate || 0);
    const dDate = new Date(loan.startDate || loan.start_date || todayStr).toISOString().split('T')[0];

    const tenure = loan.tenureMonths || loan.tenure_months || 12;
    const sDate = new Date(loan.startDate || loan.start_date || todayStr);
    const mDate = new Date(sDate);
    mDate.setMonth(mDate.getMonth() + tenure);
    const maturityDateStr = mDate.toISOString().split('T')[0];

    const transactions = prepayments.map((p) => ({
      id: p.id,
      date: new Date(p.date).toISOString().split('T')[0],
      type: 'PAYMENT' as const,
      amount: Number(p.amount),
      note: p.notes || 'Payment',
    }));

    return {
      principal: pAmt,
      annualRatePercent: rPct,
      disbursalDate: dDate,
      maturityDate: maturityDateStr,
      dayCountBasis: 365,
      compounding: 'MONTHLY_CAPITALISATION',
      roundingMode: 'ROUND',
      transactions,
    };
  }, [loan, prepayments, todayStr]);

  // Unified pure calculation
  const summary = useMemo(() => {
    return GoldLoanCalculator.calculateLedger(calculatorInput, asOfDate);
  }, [calculatorInput, asOfDate]);

  // Live preview for prospective payment
  const prospectiveSavings = useMemo(() => {
    if (!payAmount || Number(payAmount) <= 0 || !payDate) return 0;
    return GoldLoanCalculator.previewPaymentSaving(calculatorInput, payDate, payAmount);
  }, [calculatorInput, payDate, payAmount]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) return;
    setIsSubmittingPayment(true);
    try {
      await loansApi.addGoldLoanPayment(loan.id, {
        paymentDate: payDate,
        amount: payAmount,
        notes: payNotes.trim() || undefined,
      });
      setPayAmount('');
      setPayNotes('');
      await onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;
    setDeletingPaymentId(paymentId);
    try {
      await loansApi.deleteGoldLoanPayment(loan.id, paymentId);
      await onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete payment.');
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const handleCalculateQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteDate) return;
    setIsCalculatingQuote(true);
    try {
      const qSummary = GoldLoanCalculator.calculateLedger(calculatorInput, quoteDate);
      setQuoteResult({
        asOfDate: quoteDate,
        payoffQuote: qSummary.asOfStats.payoffAsOfDate,
        postedBalance: qSummary.asOfStats.postedBalance,
        unpostedAccrued: qSummary.asOfStats.unpostedAccrued,
      });
    } finally {
      setIsCalculatingQuote(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to all loans</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onEditTerms}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer shadow-sm"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Terms</span>
          </button>

          <button
            onClick={onDeleteLoan}
            className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
            title="Delete loan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Header Parameter Strip */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {(loan as any).name || loan.lender}
              </h1>
              <span className="text-xs uppercase font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                Gold / Jewel Loan
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 uppercase">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>{loan.lender}</span>
              {((loan as any).place_or_purpose || (loan as any).placeOrPurpose) && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {(loan as any).place_or_purpose || (loan as any).placeOrPurpose}
                  </span>
                </>
              )}
            </p>
          </div>

          {/* As Of Date Picker */}
          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">As of date:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Loan Core Parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Loan Amount</span>
            <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
              {formatINR(summary.principal)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Rate (% p.a.)</span>
            <span className="text-sm font-bold font-mono text-cyan-600 dark:text-cyan-400">
              {summary.annualRatePercent}% p.a.
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Disbursal Date</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {formatDate(summary.disbursalDate)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Maturity Date</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {formatDate(summary.maturityDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Payoff as of date */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Payoff as of {formatDate(summary.asOfStats.asOfDate)}
          </div>
          <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
            {formatINR(summary.asOfStats.payoffAsOfDate)}
          </div>
          <div className="text-[11px] text-slate-400">
            Posted: {formatINR(summary.asOfStats.postedBalance)} + Accrued: {formatINR(summary.asOfStats.unpostedAccrued)}
          </div>
        </div>

        {/* Card 2: Interest charged so far */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Interest charged so far
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {formatINR(summary.asOfStats.interestChargedSoFar)}
          </div>
          <div className="text-[11px] text-slate-400">
            Accrued across {summary.asOfStats.daysElapsed} days
          </div>
        </div>

        {/* Card 3: Paid by you so far */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Paid by you so far
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatINR(summary.asOfStats.paidSoFar)}
          </div>
          <div className="text-[11px] text-slate-400">
            {summary.paymentsWithSavings.length} payment(s) logged
          </div>
        </div>

        {/* Card 4: Days to maturity */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Days to maturity
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {summary.asOfStats.daysToMaturity}{' '}
            <span className="text-sm font-semibold text-slate-400">days</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Tenure: {summary.totals.totalDays} total days
          </div>
        </div>
      </div>

      {/* Smart Tip Alert Banner */}
      <div className="p-4 bg-amber-50/90 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/80 flex items-center gap-3 text-xs text-amber-900 dark:text-amber-200">
        <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
        <span className="font-medium leading-relaxed">{summary.smartTip}</span>
      </div>

      {/* What You Will Pay by Maturity (3 Scenarios) */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          What you will pay by maturity
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Scenario A */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                A. Pay nothing till maturity
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Principal {formatINR(summary.scenarios.scenarioA.principal)} + interest {formatINR(summary.scenarios.scenarioA.totalInterest)} in one bullet payment on {formatDate(summary.maturityDate)}.
              </p>
            </div>
            <div>
              <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {formatINR(summary.scenarios.scenarioA.totalCost)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Total cost</div>
            </div>
          </div>

          {/* Scenario B */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border-2 border-emerald-500/40 dark:border-emerald-600/40 shadow-sm space-y-3 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-2 right-2">
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Your plan
              </span>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                B. Your payments
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {formatINR(summary.scenarios.scenarioB.totalPaidAlongWay)} along the way + {formatINR(summary.scenarios.scenarioB.finalDueAtMaturity)} at maturity (interest: {formatINR(summary.scenarios.scenarioB.totalInterest)}).
              </p>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatINR(summary.scenarios.scenarioB.totalCost)}
                </span>
                {summary.scenarios.scenarioB.interestSavedVsA > 0 && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    (saved {formatINR(summary.scenarios.scenarioB.interestSavedVsA)})
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Total cost</div>
            </div>
          </div>

          {/* Scenario C */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                C. Pay each month's interest
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Pay interest as it accrues (~{formatINR(summary.scenarios.scenarioC.monthlyInterestApprox)}/mo). Balance stays {formatINR(summary.scenarios.scenarioC.principalDueAtMaturity)}.
              </p>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400">
                  {formatINR(summary.scenarios.scenarioC.totalCost)}
                </span>
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                  (saved {formatINR(summary.scenarios.scenarioC.interestSavedVsA)})
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Total cost</div>
            </div>
          </div>
        </div>
      </div>

      {/* Outstanding Balance Over Time Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Outstanding balance over time
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparison between compounding balance with zero payments vs your actual ad-hoc payments.
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={summary.chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
              <XAxis dataKey="monthLabel" stroke="#94a3b8" fontSize={11} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                formatter={(val: any) => [formatINR(Number(val)), '']}
                labelFormatter={(label) => `Month: ${label}`}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Line
                type="monotone"
                dataKey="noPayments"
                name="No payments"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="yourPayments"
                name="Your payments"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Your Payments Section & Inline Add Form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Your payments</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {summary.paymentsWithSavings.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Log part payments made anytime. Payments immediately reduce the principal and halt future compounding interest.
          </p>
        </div>

        {/* Inline Add Payment Form */}
        <form onSubmit={handleAddPayment} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                required
                min="1"
                step="1"
                placeholder="e.g. 5000"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Note (optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Festival bonus"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={isSubmittingPayment || !payAmount || Number(payAmount) <= 0}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-sm disabled:opacity-50 cursor-pointer shrink-0 transition-all"
                >
                  {isSubmittingPayment ? 'Saving...' : '+ Add'}
                </button>
              </div>
            </div>
          </div>

          {/* Live Saving Preview */}
          {prospectiveSavings > 0 && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Paying <strong>{formatINR(Number(payAmount))}</strong> on {formatDate(payDate)} saves <strong>{formatINR(prospectiveSavings)}</strong> interest by maturity.
              </span>
            </div>
          )}
        </form>

        {/* List of Payments */}
        {summary.paymentsWithSavings.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            No payments recorded yet. Add ad-hoc payments anytime to reduce balance and save interest.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
            {summary.paymentsWithSavings.map((p, idx) => (
              <div key={p.id || idx} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                    ₹
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm font-mono text-slate-900 dark:text-white">
                        {formatINR(p.amount)}
                      </span>
                      <span className="text-xs text-slate-400 font-sans">• {formatDate(p.date)}</span>
                    </div>
                    {p.note && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{p.note}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    saves {formatINR(p.interestSavedByMaturity)}
                  </span>
                  {p.id && (
                    <button
                      type="button"
                      disabled={deletingPaymentId === p.id}
                      onClick={() => handleDeletePayment(p.id!)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                      title="Delete payment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Month-by-Month Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600" />
            <span>Month-by-month table</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Shows monthly interest capitalization, payment impact, and balance comparison against the zero-payment baseline.
          </p>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[760px]">
            <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px]">Month End</th>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[10px] text-center">Days</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Opening</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px] text-right text-emerald-600 dark:text-emerald-400">Payment</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px] text-right text-rose-500">Interest</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Closing (Yours)</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px] text-right text-slate-400">Closing (No Pay)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {summary.monthByMonth.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="py-2 px-4 font-sans text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                    {row.monthEndLabel}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-400">
                    {row.days}
                  </td>
                  <td className="py-2 px-4 text-right text-slate-700 dark:text-slate-300">
                    {formatINR(row.opening)}
                  </td>
                  <td className="py-2 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {row.payment > 0 ? formatINR(row.payment) : '-'}
                  </td>
                  <td className="py-2 px-4 text-right text-rose-500">
                    {formatINR(row.interest)}
                  </td>
                  <td className="py-2 px-4 text-right font-bold text-slate-900 dark:text-white">
                    {formatINR(row.closingYours)}
                  </td>
                  <td className="py-2 px-4 text-right text-slate-400">
                    {formatINR(row.closingNoPay)}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals Footer Row */}
            <tfoot className="bg-slate-100 dark:bg-slate-800/80 font-mono font-bold text-slate-900 dark:text-white border-t-2 border-slate-200 dark:border-slate-700 sticky bottom-0">
              <tr>
                <td className="py-2.5 px-4 font-sans uppercase text-[11px]">Totals</td>
                <td className="py-2.5 px-3 text-center">{summary.totals.totalDays}</td>
                <td className="py-2.5 px-4 text-right">-</td>
                <td className="py-2.5 px-4 text-right text-emerald-600 dark:text-emerald-400">
                  {formatINR(summary.totals.totalPayments)}
                </td>
                <td className="py-2.5 px-4 text-right text-rose-500">
                  {formatINR(summary.totals.totalInterestYours)}
                </td>
                <td className="py-2.5 px-4 text-right font-black">
                  {formatINR(summary.totals.finalClosingYours)}
                </td>
                <td className="py-2.5 px-4 text-right text-slate-400">
                  {formatINR(summary.totals.finalClosingNoPay)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Statement Ledger & Custom Payoff Quote */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-amber-600" />
              <span>Passbook Statement Ledger</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological ledger of disbursal, payments, and monthly capitalized interest.
            </p>
          </div>

          {/* Payoff Quote Calculator */}
          <form onSubmit={handleCalculateQuote} className="flex items-center gap-2">
            <input
              type="date"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="submit"
              disabled={isCalculatingQuote || !quoteDate}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 cursor-pointer disabled:opacity-50"
            >
              Get Payoff Quote
            </button>
          </form>
        </div>

        {/* Custom Payoff Quote Result */}
        {quoteResult && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-xs flex items-center justify-between">
            <div>
              Payoff Quote as of <strong>{formatDate(quoteResult.asOfDate)}</strong>:{' '}
              <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                {formatINR(quoteResult.payoffQuote)}
              </span>
              <span className="ml-2 text-slate-400">
                (Posted: {formatINR(quoteResult.postedBalance)} + Accrued: {formatINR(quoteResult.unpostedAccrued)})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setQuoteResult(null)}
              className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px]">Date</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px]">Type</th>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[10px] text-center">Days</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Amount</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Balance</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px]">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {summary.ledger.map((entry, idx) => {
                const isPayment = entry.type === 'PAYMENT';
                const isInterest = entry.type === 'INTEREST_POSTED';

                return (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="py-2 px-4 font-sans text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatDate(entry.date)}
                    </td>
                    <td className="py-2 px-4 font-sans font-medium">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] ${
                          isPayment
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : isInterest
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                        }`}
                      >
                        {entry.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center text-slate-400">
                      {entry.days ? `${entry.days} d` : '-'}
                    </td>
                    <td
                      className={`py-2 px-4 text-right font-bold ${
                        isPayment
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isInterest
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {isPayment ? `-${formatINR(entry.amount)}` : `+${formatINR(entry.amount)}`}
                    </td>
                    <td className="py-2 px-4 text-right font-black text-slate-900 dark:text-white">
                      {formatINR(entry.balanceAfter)}
                    </td>
                    <td className="py-2 px-4 font-sans text-slate-500 dark:text-slate-400 text-[11px]">
                      {entry.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compounding Cost Analysis Card */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-purple-600" />
          <span>Compounding Cost Analysis</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
          <div>
            <span className="text-slate-400 block">Stated Rate</span>
            <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
              {summary.compoundingCost.statedRate.toFixed(2)}% p.a.
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Effective Annual Rate (EAR)</span>
            <span className="text-base font-bold font-mono text-purple-600 dark:text-purple-400">
              {summary.compoundingCost.effectiveAnnualRate.toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Simple Interest Benchmark</span>
            <span className="text-base font-bold font-mono text-slate-700 dark:text-slate-300">
              {formatINR(summary.compoundingCost.simpleInterest)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Compounding Penalty</span>
            <span className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">
              {formatINR(summary.compoundingCost.compoundingPenalty)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
