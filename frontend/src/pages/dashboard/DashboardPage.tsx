import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { dashboardApi } from '../../api/endpoints/dashboard.api';
import { incomeApi } from '../../api/endpoints/income.api';
import { loansApi } from '../../api/endpoints/loans.api';
import { adminApi } from '../../api/endpoints/admin.api';
import { formatINR, formatKpiINR } from '../../utils/currency';
import {
  Wallet,
  Users,
  TrendingUp,
  CreditCard,
  ArrowDownRight,
  PiggyBank,
  PlusCircle,
  Briefcase,
  Receipt,
  Calendar,
  Sparkles,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Info,
  Clock,
  ChevronRight,
  Loader2,
  Table,
  CheckCircle2,
  Check,
  Bell,
  Edit3,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const ASSET_COLORS = ['#0891b2', '#0d9488', '#0284c7', '#6366f1', '#8b5cf6', '#ec4899'];
const LIABILITY_COLORS = ['#e11d48', '#f97316', '#d97706', '#84cc16', '#64748b'];

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [scope, setScope] = useState<'family' | 'me'>('family');
  const [summary, setSummary] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [reminders, setReminders] = useState<any>(null);
  const [incomeAmounts, setIncomeAmounts] = useState<{ [id: string]: string }>({});
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [processingActionId, setProcessingActionId] = useState<string | null>(null);
  const [showAllReminders, setShowAllReminders] = useState(false);
  const [isRemindersCollapsed, setIsRemindersCollapsed] = useState(true);
  /** `YYYY-MM` being reviewed; null means the current month. Only current and past months are allowed. */
  const [reminderMonth, setReminderMonth] = useState<string | null>(null);
  const [isRemindersLoading, setIsRemindersLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [nwViewMode, setNwViewMode] = useState<'chart' | 'table'>('chart');
  const [cfViewMode, setCfViewMode] = useState<'chart' | 'table'>('chart');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, [scope]);

  useEffect(() => {
    if (reminderMonth === null) return;
    setIsRemindersLoading(true);
    dashboardApi
      .getReminders(scope === 'me' ? 'me' : undefined, reminderMonth)
      .then(applyReminders)
      .catch(() => undefined)
      .finally(() => setIsRemindersLoading(false));
  }, [reminderMonth]);

  const applyReminders = (remData: any) => {
    setReminders(remData);
    if (remData?.incomes) {
      const initial: { [id: string]: string } = {};
      remData.incomes.forEach((inc: any) => {
        initial[inc.id] = inc.actualAmount || inc.scheduledAmount;
      });
      setIncomeAmounts(initial);
    }
  };

  const shiftReminderMonth = (delta: number) => {
    const base = reminders?.yearMonth as string | undefined;
    if (!base) return;
    const [y, m] = base.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    const next = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    setIsRemindersCollapsed(false);
    setReminderMonth(next);
  };

  const goToCurrentReminderMonth = () => {
    setReminderMonth(null);
    dashboardApi.getReminders(scope === 'me' ? 'me' : undefined).then(applyReminders).catch(() => undefined);
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [sumData, anaData, remData, pendingData] = await Promise.all([
        dashboardApi.getSummary(scope === 'me' ? 'me' : undefined),
        dashboardApi.getAnalytics(scope === 'me' ? 'me' : undefined),
        dashboardApi.getReminders(scope === 'me' ? 'me' : undefined, reminderMonth ?? undefined),
        user?.role === 'admin' ? adminApi.getPending().catch(() => []) : Promise.resolve([]),
      ]);
      setSummary(sumData);
      setAnalytics(anaData);
      setReminders(remData);
      if (Array.isArray(pendingData)) {
        setPendingRequestsCount(pendingData.length);
      }
      if (remData?.incomes) {
        const initial: { [id: string]: string } = {};
        remData.incomes.forEach((inc: any) => {
          initial[inc.id] = inc.actualAmount || inc.scheduledAmount;
        });
        setIncomeAmounts(initial);
      }
    } catch {
      setSummary(null);
      setAnalytics(null);
      setReminders(null);
    } finally {
      setIsLoading(false);
    }
  };

  /** Today for the current month; the scheduled due date when settling an earlier month. */
  const receivedDateFor = (inc: any): string => {
    if (reminders?.isCurrentMonth !== false) return new Date().toISOString().split('T')[0];
    const [y, m] = (inc.yearMonth as string).split('-').map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return `${inc.yearMonth}-${String(Math.min(Number(inc.dueDay) || 1, lastDay)).padStart(2, '0')}`;
  };

  const handleConfirmIncome = async (inc: any) => {
    setProcessingActionId(`income-${inc.id}`);
    try {
      const amountVal = incomeAmounts[inc.id] || inc.actualAmount || inc.scheduledAmount;
      await incomeApi.confirmReceipt(inc.id, inc.yearMonth, {
        receivedAmount: Number(amountVal),
        receivedDate: receivedDateFor(inc),
      });
      setEditingIncomeId(null);
      const [remData, sumData, anaData] = await Promise.all([
        dashboardApi.getReminders(scope === 'me' ? 'me' : undefined, reminderMonth ?? undefined),
        dashboardApi.getSummary(scope === 'me' ? 'me' : undefined),
        dashboardApi.getAnalytics(scope === 'me' ? 'me' : undefined),
      ]);
      setReminders(remData);
      setSummary(sumData);
      setAnalytics(anaData);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record income arrival.');
    } finally {
      setProcessingActionId(null);
    }
  };

  const handleToggleLoanPaid = async (loanItem: any) => {
    setProcessingActionId(`loan-${loanItem.id}`);
    try {
      await loansApi.updateInstallment(loanItem.id, loanItem.installmentId, {
        isPaid: !loanItem.isPaid,
        // Settling an earlier month records the payment on its due date, not today
        ...(!loanItem.isPaid && reminders?.isCurrentMonth === false ? { paidDate: loanItem.dueDate } : {}),
      });
      const [remData, sumData, anaData] = await Promise.all([
        dashboardApi.getReminders(scope === 'me' ? 'me' : undefined, reminderMonth ?? undefined),
        dashboardApi.getSummary(scope === 'me' ? 'me' : undefined),
        dashboardApi.getAnalytics(scope === 'me' ? 'me' : undefined),
      ]);
      setReminders(remData);
      setSummary(sumData);
      setAnalytics(anaData);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update loan EMI payment status.');
    } finally {
      setProcessingActionId(null);
    }
  };

  const netWorth = Number(summary?.netWorth || 0);
  const totalAssets = Number(summary?.totalAssets || 0);
  const totalLiabilities = Number(summary?.totalLiabilities || 0);
  const monthlyIncome = Number(summary?.monthlyIncome || 0);
  const monthlyExpenses = Number(summary?.monthlyExpenses || 0);
  const monthlyEmi = Number(summary?.monthlyEmi || 0);
  const monthlySavings = Number(summary?.monthlySavings || 0);
  const savingsRatePct = summary?.savingsRatePct || '0';
  const dti = Number(summary?.debtToIncomeRatio || 0);

  // Month-over-month delta
  const lastNetWorth = Number(summary?.lastMonth?.netWorth || 0);
  const nwDelta = netWorth - lastNetWorth;
  const nwDeltaPct = lastNetWorth > 0 ? Math.round((nwDelta / lastNetWorth) * 100) : 0;

  // DTI Status
  let dtiStatus = { label: 'Healthy', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800' };
  if (dti >= 50) {
    dtiStatus = { label: 'High Debt Burden', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800' };
  } else if (dti >= 36) {
    dtiStatus = { label: 'Manageable', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800' };
  }

  // Custom Currency Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl text-xs space-y-1 z-50">
          <div className="font-bold text-slate-700 dark:text-slate-200 mb-1">{label}</div>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 font-mono">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatINR(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const getKpiFontSize = (valStr: string) => {
    const len = valStr.length;
    if (len > 13) return 'text-sm sm:text-base lg:text-lg 2xl:text-base';
    if (len > 10) return 'text-base sm:text-lg lg:text-xl 2xl:text-lg';
    if (len > 7) return 'text-lg sm:text-xl lg:text-2xl 2xl:text-xl';
    return 'text-xl sm:text-2xl lg:text-3xl 2xl:text-2xl';
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header & Scope Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Family Portfolio Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time balance sheet for {scope === 'family' ? 'all household members' : `${user?.displayName || 'You'}`}
          </p>
        </div>

        {/* Scope Toggle Button */}
        <div className="inline-flex p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300/50 dark:border-slate-700/50 self-start sm:self-auto">
          <button
            onClick={() => setScope('family')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              scope === 'family'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Whole Family
          </button>
          <button
            onClick={() => setScope('me')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              scope === 'me'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Just Me
          </button>
        </div>
      </div>

      {/* Admin Pending Join Requests Notification Banner */}
      {user?.role === 'admin' && pendingRequestsCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {pendingRequestsCount} Pending Family Join Request{pendingRequestsCount > 1 ? 's' : ''}
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-500 text-white animate-pulse">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                New member accounts are awaiting your approval to access the family wealth portfolio.
              </p>
            </div>
          </div>
          <Link
            to="/settings/members"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <span>Review & Approve Requests</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3.5 sm:gap-4">
        {/* 1. Net Worth */}
        {(() => {
          const formatted = isLoading ? '...' : formatKpiINR(netWorth);
          return (
            <div
              title={formatINR(netWorth)}
              className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 sm:mb-2">
                  <span>Net Worth</span>
                  <Wallet className="w-4 h-4 text-emerald-500 shrink-0" />
                </div>
                <div className={`${getKpiFontSize(formatted)} font-black text-slate-900 dark:text-white font-mono whitespace-nowrap tracking-tight`}>
                  {formatted}
                </div>
              </div>
              <div className="mt-2.5 sm:mt-3 flex items-center justify-between text-[10px] sm:text-[11px] border-t border-slate-100 dark:border-slate-800/80 pt-2">
                <span className="text-slate-400">MoM change</span>
                <span className={`font-semibold flex items-center gap-0.5 ${nwDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                  <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{nwDeltaPct >= 0 ? `+${nwDeltaPct}%` : `${nwDeltaPct}%`}</span>
                </span>
              </div>
            </div>
          );
        })()}

        {/* 2. Total Assets */}
        {(() => {
          const formatted = isLoading ? '...' : formatKpiINR(totalAssets);
          return (
            <div
              title={formatINR(totalAssets)}
              className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 sm:mb-2">
                  <span>Total Assets</span>
                  <Briefcase className="w-4 h-4 text-cyan-500 shrink-0" />
                </div>
                <div className={`${getKpiFontSize(formatted)} font-black text-slate-900 dark:text-white font-mono whitespace-nowrap tracking-tight`}>
                  {formatted}
                </div>
              </div>
              <div className="mt-2.5 sm:mt-3 text-[10px] sm:text-[11px] text-slate-400 truncate border-t border-slate-100 dark:border-slate-800/80 pt-2">
                Bank, FDs, gold & more
              </div>
            </div>
          );
        })()}

        {/* 3. Total Liabilities */}
        {(() => {
          const formatted = isLoading ? '...' : formatKpiINR(totalLiabilities);
          return (
            <div
              title={formatINR(totalLiabilities)}
              className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 sm:mb-2">
                  <span>Total Debt</span>
                  <CreditCard className="w-4 h-4 text-rose-500 shrink-0" />
                </div>
                <div className={`${getKpiFontSize(formatted)} font-black text-rose-600 dark:text-rose-400 font-mono whitespace-nowrap tracking-tight`}>
                  {formatted}
                </div>
              </div>
              <div className="mt-2.5 sm:mt-3 flex items-center justify-between text-[10px] sm:text-[11px] border-t border-slate-100 dark:border-slate-800/80 pt-2">
                <span className="text-slate-400">Active Debt</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {analytics?.payoffTimeline?.length || 0} loan{(analytics?.payoffTimeline?.length || 0) === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          );
        })()}

        {/* 4. Monthly Income */}
        {(() => {
          const formatted = isLoading ? '...' : formatKpiINR(monthlyIncome);
          return (
            <div
              title={formatINR(monthlyIncome)}
              className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 sm:mb-2">
                  <span>Monthly Inflow</span>
                  <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                </div>
                <div className={`${getKpiFontSize(formatted)} font-black text-slate-900 dark:text-white font-mono whitespace-nowrap tracking-tight`}>
                  {formatted}
                </div>
              </div>
              <div className="mt-2.5 sm:mt-3 text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate border-t border-slate-100 dark:border-slate-800/80 pt-2">
                Active recurring incomes
              </div>
            </div>
          );
        })()}

        {/* 5. Monthly Expenses + EMI */}
        {(() => {
          const totalOutflow = monthlyExpenses + monthlyEmi;
          const formatted = isLoading ? '...' : formatKpiINR(totalOutflow);
          return (
            <div
              title={formatINR(totalOutflow)}
              className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 sm:mb-2">
                  <span>Monthly Outflow</span>
                  <ArrowDownRight className="w-4 h-4 text-amber-500 shrink-0" />
                </div>
                <div className={`${getKpiFontSize(formatted)} font-black text-slate-900 dark:text-white font-mono whitespace-nowrap tracking-tight`}>
                  {formatted}
                </div>
              </div>
              <div className="mt-2.5 sm:mt-3 flex flex-col gap-0.5 text-[10px] sm:text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2 overflow-hidden">
                <div className="flex items-center justify-between gap-1">
                  <span>Exp:</span>
                  <strong className="font-mono text-slate-700 dark:text-slate-300 truncate">{formatKpiINR(monthlyExpenses)}</strong>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span>EMI:</span>
                  <strong className="font-mono text-rose-500 truncate">{formatKpiINR(monthlyEmi)}</strong>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 6. Net Monthly Savings */}
        {(() => {
          const formatted = isLoading ? '...' : formatKpiINR(monthlySavings);
          return (
            <div
              title={formatINR(monthlySavings)}
              className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 sm:mb-2">
                  <span>Net Savings</span>
                  <PiggyBank className="w-4 h-4 text-teal-500 shrink-0" />
                </div>
                <div className={`${getKpiFontSize(formatted)} font-black font-mono whitespace-nowrap tracking-tight ${monthlySavings >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600'}`}>
                  {formatted}
                </div>
              </div>
              <div className="mt-2.5 sm:mt-3 flex items-center justify-between text-[10px] sm:text-[11px] border-t border-slate-100 dark:border-slate-800/80 pt-2">
                <span className="text-slate-400">Savings Rate</span>
                <span className="font-semibold text-teal-600 dark:text-teal-400">{savingsRatePct}%</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Pending Reminders & Monthly Action Queue */}
      {reminders && (reminders.incomes?.length > 0 || reminders.loans?.length > 0 || reminderMonth !== null) && (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all ${
          isRemindersCollapsed ? 'p-4 sm:p-5' : 'p-5 sm:p-6 space-y-6'
        }`}>
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isRemindersCollapsed ? '' : 'border-b border-slate-100 dark:border-slate-800 pb-4'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    Monthly Action Queue & Reminders
                  </h2>
                  <div className="inline-flex items-center gap-0.5" role="group" aria-label="Reminder month">
                    <button
                      type="button"
                      onClick={() => shiftReminderMonth(-1)}
                      aria-label="Previous month"
                      className="min-h-[44px] min-w-[44px] sm:min-h-8 sm:min-w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span
                      aria-live="polite"
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 min-w-[7.5rem] text-center"
                    >
                      {reminders.monthName}
                    </span>
                    <button
                      type="button"
                      onClick={() => shiftReminderMonth(1)}
                      disabled={reminders.isCurrentMonth}
                      aria-label="Next month"
                      className="min-h-[44px] min-w-[44px] sm:min-h-8 sm:min-w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    {!reminders.isCurrentMonth && (
                      <button
                        type="button"
                        onClick={goToCurrentReminderMonth}
                        className="ml-1 text-xs font-semibold text-cyan-700 dark:text-cyan-400 hover:underline min-h-[44px] sm:min-h-8 px-2 cursor-pointer"
                      >
                        Current month
                      </button>
                    )}
                  </div>
                </div>
                {!isRemindersCollapsed ? (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Verify recurring income arrivals and mark scheduled monthly loan EMIs.
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {reminders.totalPendingCount > 0
                      ? `${reminders.totalPendingCount} pending task${reminders.totalPendingCount === 1 ? '' : 's'} to verify for ${reminders.monthName}`
                      : `All income arrivals & loan EMIs recorded for ${reminders.monthName}`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
              {reminders.totalPendingCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80">
                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span>{reminders.totalPendingCount} Action{reminders.totalPendingCount === 1 ? '' : 's'} Pending</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>All Caught Up</span>
                </span>
              )}

              {!isRemindersCollapsed && (
                <button
                  type="button"
                  onClick={() => setShowAllReminders(!showAllReminders)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer mr-1"
                >
                  {showAllReminders ? 'Show pending only' : 'View all items'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsRemindersCollapsed(!isRemindersCollapsed)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                title={isRemindersCollapsed ? 'Expand reminders' : 'Collapse reminders'}
              >
                <span>{isRemindersCollapsed ? 'Show Reminders' : 'Collapse'}</span>
                {isRemindersCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>
            </div>
          </div>

          {!isRemindersCollapsed && (
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-opacity ${isRemindersLoading ? 'opacity-50 pointer-events-none' : ''}`} aria-busy={isRemindersLoading}>
            {/* Column 1: Recurring Income Arrivals */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Recurring Income Arrivals
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {reminders.incomes.filter((i: any) => !i.isConfirmed).length} pending
                </span>
              </div>

              {reminders.incomes.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 text-center">
                  No recurring income reminders configured.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reminders.incomes
                    .filter((inc: any) => showAllReminders || !inc.isConfirmed || editingIncomeId === inc.id)
                    .map((inc: any) => {
                      const isEditing = editingIncomeId === inc.id;
                      const currentVal = incomeAmounts[inc.id] ?? inc.actualAmount;
                      const numVal = parseFloat(currentVal);
                      const baseVal = parseFloat(inc.scheduledAmount);
                      const variance = !isNaN(numVal) && !isNaN(baseVal) ? numVal - baseVal : 0;

                      return (
                        <div
                          key={inc.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            inc.isConfirmed && !isEditing
                              ? 'bg-slate-50/70 dark:bg-slate-850/60 border-slate-200/80 dark:border-slate-800'
                              : 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200/80 dark:border-emerald-800/60 shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                  {inc.label}
                                </span>
                                <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  {inc.type}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>Expected around day {inc.dueDay} • Scheduled: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatINR(inc.scheduledAmount)}</strong></span>
                              </div>
                            </div>

                            {inc.isConfirmed && !isEditing ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Received</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                                <Clock className="w-3 h-3" />
                                <span>Pending</span>
                              </span>
                            )}
                          </div>

                          {/* Action area */}
                          {inc.isConfirmed && !isEditing ? (
                            <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {formatINR(inc.actualAmount)} received
                                {variance !== 0 && (
                                  <span className={`ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded ${variance > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                    {variance > 0 ? `+${formatINR(variance)}` : `-${formatINR(Math.abs(variance))}`}
                                  </span>
                                )}
                              </span>
                              <button
                                onClick={() => setEditingIncomeId(inc.id)}
                                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Adjust amount</span>
                              </button>
                            </div>
                          ) : (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">₹</span>
                                  <input
                                    type="number"
                                    value={currentVal}
                                    onChange={(e) => setIncomeAmounts({ ...incomeAmounts, [inc.id]: e.target.value })}
                                    className="w-full pl-6 pr-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-inner"
                                    placeholder="Received amount"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmIncome(inc)}
                                  disabled={processingActionId === `income-${inc.id}`}
                                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm disabled:opacity-50 shrink-0"
                                >
                                  {processingActionId === `income-${inc.id}` ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                  <span>{isEditing ? 'Save Adjustment' : 'Confirm Arrival'}</span>
                                </button>
                                {isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => setEditingIncomeId(null)}
                                    className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                              {variance !== 0 && (
                                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <span>Monthly variance vs contract:</span>
                                  <span className={`font-mono font-bold ${variance > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {variance > 0 ? `+${formatINR(variance)} extra` : `-${formatINR(Math.abs(variance))} shortfall`}
                                  </span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {reminders.incomes.filter((i: any) => !i.isConfirmed).length === 0 && !showAllReminders && (
                    <div className="p-3 text-center text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/50 dark:border-emerald-800/40">
                      ✓ All recurring incomes confirmed for {reminders.monthName}.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Column 2: Scheduled Loan EMIs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-rose-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Scheduled Loan EMIs
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {reminders.loans.filter((l: any) => !l.isPaid).length} pending
                </span>
              </div>

              {reminders.loans.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 text-center">
                  No loan EMIs scheduled for this month.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reminders.loans
                    .filter((loanItem: any) => showAllReminders || !loanItem.isPaid)
                    .map((loanItem: any) => (
                      <div
                        key={loanItem.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          loanItem.isPaid
                            ? 'bg-slate-50/70 dark:bg-slate-850/60 border-slate-200/80 dark:border-slate-800'
                            : 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-200/80 dark:border-rose-800/60 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                {loanItem.name || loanItem.lender}
                              </span>
                              <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {loanItem.loanType}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                              {loanItem.placeOrPurpose && (
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  {loanItem.placeOrPurpose} •
                                </span>
                              )}
                              <span>Lender: {loanItem.lender}</span>
                              <span>• Due: {loanItem.dueDate ? new Date(loanItem.dueDate).toLocaleDateString() : `Day ${loanItem.dueDay}`}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-bold text-xs sm:text-sm text-rose-600 dark:text-rose-400">
                              {formatINR(loanItem.emiAmount)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              P: {formatINR(loanItem.principalComponent)} | I: {formatINR(loanItem.interestComponent)}
                            </div>
                          </div>
                        </div>

                        {/* Action area */}
                        {loanItem.isPaid ? (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Paid for this month</span>
                            </span>
                            <button
                              onClick={() => handleToggleLoanPaid(loanItem)}
                              disabled={processingActionId === `loan-${loanItem.id}`}
                              className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer disabled:opacity-50"
                            >
                              Undo payment
                            </button>
                          </div>
                        ) : (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                            <Link
                              to={`/loans/${loanItem.id}`}
                              className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-0.5"
                            >
                              <span>View loan details</span>
                              <ChevronRight className="w-3 h-3" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleToggleLoanPaid(loanItem)}
                              disabled={processingActionId === `loan-${loanItem.id}`}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                            >
                              {processingActionId === `loan-${loanItem.id}` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span>Mark EMI Paid</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  {reminders.loans.filter((l: any) => !l.isPaid).length === 0 && !showAllReminders && (
                    <div className="p-3 text-center text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/50 dark:border-emerald-800/40">
                      ✓ All scheduled loan EMIs marked as paid for {reminders.monthName}.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      )}

      {/* Row 1: Net Worth Trend (2/3) & Asset Allocation (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Net Worth Trailing 12-Month Multi-Line Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Net Worth & Balance Sheet Trend
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Trailing 12-month trajectory of assets, liabilities, and cumulative equity.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setNwViewMode(nwViewMode === 'chart' ? 'table' : 'chart')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Table className="w-3.5 h-3.5" />
              <span>{nwViewMode === 'chart' ? 'View as Table' : 'View as Chart'}</span>
            </button>
          </div>

          <div className="h-72 w-full overflow-y-auto">
            {nwViewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700 font-sans">
                    <tr>
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3 text-right text-emerald-600 font-bold">Net Worth</th>
                      <th className="py-2.5 px-3 text-right text-cyan-600">Assets</th>
                      <th className="py-2.5 px-3 text-right text-rose-500">Liabilities</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {analytics?.netWorthTrend?.map((row: any) => (
                      <tr key={row.month} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                        <td className="py-2 px-3 font-sans font-medium text-slate-700 dark:text-slate-300">{row.month}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600">{formatINR(row.netWorth)}</td>
                        <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-300">{formatINR(row.assets)}</td>
                        <td className="py-2 px-3 text-right text-rose-500">{formatINR(row.liabilities)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : analytics?.netWorthTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.netWorthTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.4} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
                  <YAxis
                    tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Line
                    type="monotone"
                    name="Net Worth"
                    dataKey="netWorth"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    name="Assets"
                    dataKey="assets"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    name="Liabilities"
                    dataKey="liabilities"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No balance sheet history recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Asset Allocation Donut */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Asset Allocation
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Distribution across asset classes.
            </p>
          </div>

          <div className="h-60 w-full relative flex items-center justify-center">
            {analytics?.assetAllocation?.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.assetAllocation}
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="type"
                    >
                      {analytics.assetAllocation.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={ASSET_COLORS[index % ASSET_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Donut Center Total Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</div>
                  <div className="text-sm font-extrabold font-mono text-slate-900 dark:text-white">
                    {formatINR(totalAssets)}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400 text-center">
                <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <span>No assets logged yet</span>
              </div>
            )}
          </div>

          {/* Allocation Legend */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            {analytics?.assetAllocation?.slice(0, 4).map((item: any, idx: number) => (
              <div key={item.type} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ASSET_COLORS[idx % ASSET_COLORS.length] }} />
                <span className="truncate capitalize text-slate-600 dark:text-slate-400">{item.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Liability Breakdown + DTI Gauge (1/3) & Cash Flow Trend (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liability Breakdown & DTI Gauge */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Liability Breakdown & DTI
              </h3>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${dtiStatus.color}`}>
                {dtiStatus.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Debt-to-Income (DTI) ratio: <strong className="font-mono text-slate-700 dark:text-slate-300">{dti}%</strong>
            </p>
          </div>

          <div className="h-52 w-full relative flex items-center justify-center my-2">
            {analytics?.liabilityBreakdown?.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.liabilityBreakdown}
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="type"
                    >
                      {analytics.liabilityBreakdown.map((_: any, index: number) => (
                        <Cell key={`cell-liab-${index}`} fill={LIABILITY_COLORS[index % LIABILITY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Debt</div>
                  <div className="text-xs font-black font-mono text-rose-600 dark:text-rose-400">
                    {formatINR(totalLiabilities)}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400 text-center">
                <CreditCard className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <span>Zero active liabilities 🎉</span>
              </div>
            )}
          </div>

          {/* DTI Gauge Bar */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>DTI Gauge (Benchmark &lt; 36%)</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{dti}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full" style={{ width: '36%' }} title="Healthy" />
              <div className="bg-amber-500 h-full" style={{ width: '14%' }} title="Manageable" />
              <div className="bg-rose-500 h-full" style={{ width: '50%' }} title="High Risk" />
            </div>
          </div>
        </div>

        {/* Cash Flow Trend: Income vs Stacked Expenses + EMI */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly Cash Flow (Income vs Outflow)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Surplus occurs when the green income bar exceeds combined expenses + loan EMIs.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCfViewMode(cfViewMode === 'chart' ? 'table' : 'chart')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Table className="w-3.5 h-3.5" />
              <span>{cfViewMode === 'chart' ? 'View as Table' : 'View as Chart'}</span>
            </button>
          </div>

          <div className="h-72 w-full overflow-y-auto">
            {cfViewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3 text-right text-emerald-600">Inflow</th>
                      <th className="py-2.5 px-3 text-right text-amber-500">Expenses</th>
                      <th className="py-2.5 px-3 text-right text-rose-500">Loan EMI</th>
                      <th className="py-2.5 px-3 text-right text-cyan-600">Net Surplus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {analytics?.cashFlowTrend?.map((row: any) => {
                      const outflow = (row.expenses || 0) + (row.emi || 0);
                      const surplus = (row.income || 0) - outflow;
                      return (
                        <tr key={row.month} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                          <td className="py-2 px-3 font-sans font-medium text-slate-700 dark:text-slate-300">{row.month}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-600">{formatINR(row.income)}</td>
                          <td className="py-2 px-3 text-right text-amber-500">{formatINR(row.expenses)}</td>
                          <td className="py-2 px-3 text-right text-rose-500">{formatINR(row.emi)}</td>
                          <td className={`py-2 px-3 text-right font-bold ${surplus >= 0 ? 'text-cyan-600' : 'text-rose-600'}`}>
                            {formatINR(surplus)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : analytics?.cashFlowTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.cashFlowTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.4} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
                  <YAxis
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar dataKey="income" name="Monthly Inflow" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Household Expenses" stackId="outflow" fill="#f59e0b" />
                  <Bar dataKey="emi" name="Loan EMI Debt" stackId="outflow" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No monthly transactions recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Debt Payoff Timeline (Gantt-style horizontal schedule) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-500" />
              <span>Debt Payoff Timeline (Baseline Schedule)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Projected payoff horizons under standard amortization schedules.
            </p>
          </div>
          <Link
            to="/loans"
            className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
          >
            <span>View All Loans</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {analytics?.payoffTimeline?.length > 0 ? (
          <div className="space-y-4">
            {analytics.payoffTimeline.map((item: any) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="sm:w-1/3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{item.lender}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      {item.type}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    EMI: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatINR(item.emi)}/mo</strong> • Balance: <span className="font-mono text-rose-500">{formatINR(item.principal)}</span>
                  </div>
                </div>

                <div className="sm:w-2/3 space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-slate-500">
                    <span>Started: {item.startDate}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Payoff: {item.payoffDate}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full rounded-full transition-all"
                      style={{ width: '65%' }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 text-right">
                    {item.tenureMonths} total installments scheduled
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            No active loans to track. Visit the <Link to="/loans" className="text-cyan-600 font-semibold underline">Loans</Link> page to register a loan.
          </div>
        )}
      </div>

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/assets"
          className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500 transition-all shadow-sm group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Briefcase className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Assets</span>
            <PlusCircle className="w-3.5 h-3.5 text-cyan-500" />
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Bank accounts, mutual funds, real estate & gold.
          </p>
        </Link>

        <Link
          to="/loans"
          className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-rose-500 transition-all shadow-sm group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Loans & Liabilities</span>
            <PlusCircle className="w-3.5 h-3.5 text-rose-500" />
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track EMIs, schedules, and run prepayment what-if tests.
          </p>
        </Link>

        <Link
          to="/income"
          className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition-all shadow-sm group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Income Sources</span>
            <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage salaries, rents, dividends, and bonuses.
          </p>
        </Link>

        <Link
          to="/expenses"
          className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 transition-all shadow-sm group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Receipt className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Expenses & Insurance</span>
            <PlusCircle className="w-3.5 h-3.5 text-amber-500" />
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Monitor household outflows and premium renewal dates.
          </p>
        </Link>
      </div>
    </div>
  );
};
