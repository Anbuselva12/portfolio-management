import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { AllocationItem } from '../../types';
import { formatINR, formatKpiINR } from '../../utils/currency';
import {
  PieChart as PieChartIcon,
  Table as TableIcon,
  Home,
  User,
  Coins,
  Car,
  GraduationCap,
  Briefcase,
  CreditCard,
  Percent,
  Layers,
} from 'lucide-react';

interface LoanTypeBreakdownChartProps {
  allocations: AllocationItem[];
  totalDebt: string | number;
}

interface GroupedCategory {
  key: string;
  label: string;
  totalPrincipal: number;
  count: number;
  avgRate: number;
  totalMinEmi: number;
  percentage: number;
  color: string;
  icon: any;
  loans: AllocationItem[];
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  home: { label: 'Home Loan / Mortgage', color: '#0284c7', icon: Home },
  personal: { label: 'Personal Loan', color: '#e11d48', icon: User },
  jewel: { label: 'Gold / Jewel Loan', color: '#d97706', icon: Coins },
  car: { label: 'Vehicle / Auto Loan', color: '#0d9488', icon: Car },
  education: { label: 'Education Loan', color: '#7c3aed', icon: GraduationCap },
  business: { label: 'Business Loan', color: '#2563eb', icon: Briefcase },
  other: { label: 'Other Liabilities', color: '#64748b', icon: CreditCard },
};

export const LoanTypeBreakdownChart: React.FC<LoanTypeBreakdownChartProps> = ({
  allocations,
  totalDebt,
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const grandTotal = useMemo(() => {
    const fromAlloc = allocations.reduce((sum, a) => sum + Number(a.currentPrincipal || 0), 0);
    return fromAlloc > 0 ? fromAlloc : Number(totalDebt || 0);
  }, [allocations, totalDebt]);

  const categories = useMemo(() => {
    const map = new Map<string, { totalP: number; count: number; weightedRateSum: number; totalEmi: number; loans: AllocationItem[] }>();

    for (const alloc of allocations) {
      const rawType = (alloc.type || 'other').toLowerCase();
      let normKey = 'other';
      if (rawType.includes('jewel') || rawType.includes('gold')) {
        normKey = 'jewel';
      } else if (rawType.includes('home')) {
        normKey = 'home';
      } else if (rawType.includes('personal')) {
        normKey = 'personal';
      } else if (rawType.includes('car') || rawType.includes('vehicle') || rawType.includes('auto')) {
        normKey = 'car';
      } else if (rawType.includes('education') || rawType.includes('student')) {
        normKey = 'education';
      } else if (rawType.includes('business')) {
        normKey = 'business';
      } else {
        normKey = 'other';
      }

      const p = Number(alloc.currentPrincipal || 0);
      const r = Number(alloc.interestRate || 0);
      const emi = Number(alloc.minimumEmi || 0);

      const existing = map.get(normKey) || { totalP: 0, count: 0, weightedRateSum: 0, totalEmi: 0, loans: [] };
      existing.totalP += p;
      existing.count += 1;
      existing.weightedRateSum += p * r;
      existing.totalEmi += emi;
      existing.loans.push(alloc);
      map.set(normKey, existing);
    }

    const list: GroupedCategory[] = [];
    for (const [key, data] of map.entries()) {
      if (data.totalP <= 0 && data.count === 0) continue;
      const config = TYPE_CONFIG[key] || TYPE_CONFIG.other;
      const avgRate = data.totalP > 0 ? data.weightedRateSum / data.totalP : 0;
      const percentage = grandTotal > 0 ? (data.totalP / grandTotal) * 100 : 0;

      list.push({
        key,
        label: config.label,
        totalPrincipal: data.totalP,
        count: data.count,
        avgRate,
        totalMinEmi: data.totalEmi,
        percentage,
        color: config.color,
        icon: config.icon,
        loans: data.loans,
      });
    }

    return list.sort((a, b) => b.totalPrincipal - a.totalPrincipal);
  }, [allocations, grandTotal]);

  const pieChartData = useMemo(() => {
    return categories.map((cat) => ({
      name: cat.label,
      value: cat.totalPrincipal,
      color: cat.color,
      count: cat.count,
      avgRate: cat.avgRate,
      percentage: cat.percentage,
    }));
  }, [categories]);

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1">
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.name}</span>
          </div>
          <div className="text-slate-500 dark:text-slate-400">
            Balance: <strong className="text-slate-900 dark:text-white font-mono">{formatINR(item.value)}</strong>
          </div>
          <div className="text-slate-500 dark:text-slate-400">
            Share: <strong className="text-cyan-600 dark:text-cyan-400 font-mono">{item.percentage.toFixed(1)}%</strong>
          </div>
          <div className="text-slate-500 dark:text-slate-400">
            Active Loans: <strong className="text-slate-700 dark:text-slate-300 font-mono">{item.count}</strong>
          </div>
          <div className="text-slate-500 dark:text-slate-400">
            Avg APR: <strong className="text-rose-500 font-mono">{item.avgRate.toFixed(2)}%</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <span>Loan Portfolio Breakdown by Debt Type</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Total active debt across all categories: <strong className="font-mono text-rose-600 dark:text-rose-400">{formatINR(grandTotal)}</strong> across {allocations.length} loan accounts.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('chart')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'chart'
                ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PieChartIcon className="w-3.5 h-3.5" />
            <span>Visual Chart</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>View as Table</span>
          </button>
        </div>
      </div>

      {viewMode === 'chart' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Donut Chart Visualization */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="h-64 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-type-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Debt</span>
                <span className="text-sm sm:text-base font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                  {formatKpiINR(grandTotal)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {allocations.length} active loans
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Categorical Progress Rows */}
          <div className="lg:col-span-7 space-y-3">
            {categories.map((cat) => {
              const IconComponent = cat.icon;
              return (
                <div
                  key={cat.key}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: cat.color }}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {cat.label}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {cat.count} {cat.count === 1 ? 'loan' : 'loans'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>Avg APR: <strong className="font-mono text-rose-500 font-semibold">{cat.avgRate.toFixed(2)}%</strong></span>
                          <span>•</span>
                          <span>Share: <strong className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{cat.percentage.toFixed(1)}%</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {formatINR(cat.totalPrincipal)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {cat.key === 'jewel' ? 'Bullet Payoff' : `Min EMI: ${formatINR(cat.totalMinEmi)}`}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(2, Math.min(100, cat.percentage))}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Tabular View */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Debt Category</th>
                <th className="py-3 px-4 text-center">Active Count</th>
                <th className="py-3 px-4">Total Outstanding Principal</th>
                <th className="py-3 px-4 text-center">Share of Debt</th>
                <th className="py-3 px-4 text-center">Weighted Avg APR</th>
                <th className="py-3 px-4 text-right">Monthly Obligation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {categories.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <tr key={cat.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="font-semibold text-slate-900 dark:text-white">{cat.label}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                      {cat.count}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {formatINR(cat.totalPrincipal)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-cyan-600 dark:text-cyan-400">
                      {cat.percentage.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-rose-500">
                      {cat.avgRate.toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                      {cat.key === 'jewel' ? 'Bullet Payoff' : formatINR(cat.totalMinEmi)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50/80 dark:bg-slate-800/80 font-bold border-t-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <td className="py-3 px-4">Total Portfolio Debt</td>
                <td className="py-3 px-4 text-center font-mono">{allocations.length}</td>
                <td className="py-3 px-4 font-mono text-rose-600 dark:text-rose-400">{formatINR(grandTotal)}</td>
                <td className="py-3 px-4 text-center font-mono">100.0%</td>
                <td className="py-3 px-4 text-center font-mono">-</td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatINR(categories.reduce((sum, c) => sum + c.totalMinEmi, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
