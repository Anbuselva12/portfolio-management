import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Briefcase,
  ChevronRight,
  CreditCard,
  PiggyBank,
  Receipt,
  TrendingUp,
} from 'lucide-react';
import { formatINR, formatKpiINR } from '../../utils/currency';

interface MobileHomeProps {
  isLoading: boolean;
  netWorth: number;
  nwDelta: number;
  nwDeltaPct: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyIncome: number;
  monthlyOutflow: number;
  monthlySavings: number;
  savingsRatePct: number | string;
  pendingCount: number;
}

interface Metric {
  label: string;
  value: number;
  icon: React.ElementType;
  iconClass: string;
  valueClass: string;
}

const QUICK_LINKS = [
  { to: '/assets', label: 'Assets', icon: Briefcase, tone: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300' },
  { to: '/loans', label: 'Loans', icon: CreditCard, tone: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
  { to: '/income', label: 'Income', icon: TrendingUp, tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  { to: '/expenses', label: 'Expenses', icon: Receipt, tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
] as const;

/** Phone-only home summary (hidden from `md` up, where the desktop KPI strip is shown). */
export const MobileHome: React.FC<MobileHomeProps> = ({
  isLoading,
  netWorth,
  nwDelta,
  nwDeltaPct,
  totalAssets,
  totalLiabilities,
  monthlyIncome,
  monthlyOutflow,
  monthlySavings,
  savingsRatePct,
  pendingCount,
}) => {
  const show = (n: number) => (isLoading ? '…' : formatKpiINR(n));
  const metrics: Metric[] = [
    { label: 'Assets', value: totalAssets, icon: Briefcase, iconClass: 'text-cyan-500', valueClass: 'text-slate-900 dark:text-white' },
    { label: 'Debt', value: totalLiabilities, icon: CreditCard, iconClass: 'text-rose-500', valueClass: 'text-rose-600 dark:text-rose-400' },
    { label: 'Inflow / mo', value: monthlyIncome, icon: TrendingUp, iconClass: 'text-emerald-500', valueClass: 'text-slate-900 dark:text-white' },
    { label: 'Outflow / mo', value: monthlyOutflow, icon: ArrowDownRight, iconClass: 'text-amber-500', valueClass: 'text-slate-900 dark:text-white' },
  ];
  const isUp = nwDelta >= 0;

  return (
    <section className="md:hidden space-y-4" aria-label="Portfolio summary">
      <div
        title={formatINR(netWorth)}
        className="rounded-3xl bg-gradient-to-br from-cyan-600 to-teal-600 text-white p-5 shadow-sm"
      >
        <div className="text-xs font-semibold uppercase tracking-wider text-cyan-50/90">Net worth</div>
        <div className="mt-1 text-3xl font-black font-mono tracking-tight break-all">{show(netWorth)}</div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 font-semibold">
            {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {nwDeltaPct >= 0 ? `+${nwDeltaPct}` : nwDeltaPct}% vs last month
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 font-semibold">
            <PiggyBank className="w-3.5 h-3.5" />
            {isLoading ? '…' : `${show(monthlySavings)} saved · ${savingsRatePct}%`}
          </span>
        </div>
      </div>

      {pendingCount > 0 && (
        <a
          href="#reminders"
          className="flex items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 min-h-[48px]"
        >
          <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="flex-1 text-sm font-semibold text-amber-900 dark:text-amber-200">
            {pendingCount} task{pendingCount === 1 ? '' : 's'} to verify this month
          </span>
          <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
        </a>
      )}

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            title={formatINR(m.value)}
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 min-w-0"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="truncate">{m.label}</span>
              <m.icon className={`w-4 h-4 shrink-0 ${m.iconClass}`} />
            </div>
            <div className={`mt-1.5 text-lg font-black font-mono tracking-tight truncate ${m.valueClass}`}>{show(m.value)}</div>
          </div>
        ))}
      </div>

      <nav className="grid grid-cols-4 gap-2" aria-label="Quick links">
        {QUICK_LINKS.map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-3 min-h-[72px] active:bg-slate-50 dark:active:bg-slate-800"
          >
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${q.tone}`}>
              <q.icon className="w-5 h-5" />
            </span>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{q.label}</span>
          </Link>
        ))}
      </nav>
    </section>
  );
};
