import React, { useState } from 'react';
import { StrategySimulationResult } from '../../types';
import { formatINR } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import {
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  Clock,
  Table,
  BarChart3,
} from 'lucide-react';

interface StrategyTimelineOverlayProps {
  strategyA: StrategySimulationResult;
  strategyB: StrategySimulationResult;
  allStrategies: StrategySimulationResult[];
  onSelectA: (name: string) => void;
  onSelectB: (name: string) => void;
}

export const StrategyTimelineOverlay: React.FC<StrategyTimelineOverlayProps> = ({
  strategyA,
  strategyB,
  allStrategies,
  onSelectA,
  onSelectB,
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  // Max months for proportional bar width
  const maxMonth = Math.max(
    ...strategyA.timeline.map((t) => t.payoffMonth),
    ...strategyB.timeline.map((t) => t.payoffMonth),
    12,
  );

  const monthsDifference = strategyA.monthsToDebtFree - strategyB.monthsToDebtFree;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-600" />
            <span>Dual-Strategy Payoff Timeline Comparison</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Directly compare payoff horizons and interest savings between any two strategies.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Strategy A Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-3 h-3 rounded-full bg-cyan-500 shrink-0" />
            <select
              value={strategyA.strategyName}
              onChange={(e) => onSelectA(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {allStrategies.map((s) => (
                <option key={s.strategyName} value={s.strategyName}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs font-bold text-slate-400">vs</span>

          {/* Strategy B Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <select
              value={strategyB.strategyName}
              onChange={(e) => onSelectB(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {allStrategies.map((s) => (
                <option key={s.strategyName} value={s.strategyName}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* View as Table Toggle (Accessibility pass) */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            {viewMode === 'chart' ? <Table className="w-3.5 h-3.5" /> : <BarChart3 className="w-3.5 h-3.5" />}
            <span>{viewMode === 'chart' ? 'View as Table' : 'View as Chart'}</span>
          </button>
        </div>
      </div>

      {/* High-level Delta Banner */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-6 text-xs">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              <span>{strategyA.title}</span>
            </div>
            <div className="font-mono font-bold text-sm text-slate-900 dark:text-white mt-0.5">
              {strategyA.monthsToDebtFree} mos • +{formatINR(strategyA.totalInterestSaved)} saved
            </div>
          </div>

          <div className="border-l border-slate-200 dark:border-slate-700 pl-6">
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{strategyB.title}</span>
            </div>
            <div className="font-mono font-bold text-sm text-slate-900 dark:text-white mt-0.5">
              {strategyB.monthsToDebtFree} mos • +{formatINR(strategyB.totalInterestSaved)} saved
            </div>
          </div>
        </div>

        <div className="text-right text-xs">
          {monthsDifference !== 0 ? (
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {monthsDifference > 0
                ? `${strategyB.title} becomes debt-free ${monthsDifference} months sooner!`
                : `${strategyA.title} becomes debt-free ${Math.abs(monthsDifference)} months sooner!`}
            </span>
          ) : (
            <span className="text-slate-400">Both strategies achieve debt-free status simultaneously.</span>
          )}
        </div>
      </div>

      {/* Chart View */}
      {viewMode === 'chart' ? (
        <div className="space-y-5 pt-2">
          {strategyA.timeline.map((loanA) => {
            const loanB = strategyB.timeline.find((t) => t.loanId === loanA.loanId) || loanA;
            const pctA = Math.round((loanA.payoffMonth / maxMonth) * 100);
            const pctB = Math.round((loanB.payoffMonth / maxMonth) * 100);

            return (
              <div key={loanA.loanId} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {loanA.lender} ({loanA.type})
                  </span>
                  <div className="text-[11px] font-mono text-slate-400 space-x-3">
                    <span>
                      <strong className="text-cyan-600 dark:text-cyan-400">{loanA.payoffMonth}m</strong> ({formatDate(loanA.payoffDate)})
                    </span>
                    <span>vs</span>
                    <span>
                      <strong className="text-emerald-600 dark:text-emerald-400">{loanB.payoffMonth}m</strong> ({formatDate(loanB.payoffDate)})
                    </span>
                  </div>
                </div>

                {/* Strategy A Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.max(4, pctA)}%` }}
                    title={`${strategyA.title}: ${loanA.payoffMonth} months`}
                  />
                </div>

                {/* Strategy B Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.max(4, pctB)}%` }}
                    title={`${strategyB.title}: ${loanB.payoffMonth} months`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Accessible Table View */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Loan</th>
                <th className="py-2.5 px-4 font-semibold text-cyan-600">{strategyA.title} Payoff</th>
                <th className="py-2.5 px-4 font-semibold text-cyan-600">Months</th>
                <th className="py-2.5 px-4 font-semibold text-emerald-600">{strategyB.title} Payoff</th>
                <th className="py-2.5 px-4 font-semibold text-emerald-600">Months</th>
                <th className="py-2.5 px-4 font-semibold text-right">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {strategyA.timeline.map((loanA) => {
                const loanB = strategyB.timeline.find((t) => t.loanId === loanA.loanId) || loanA;
                const diff = loanA.payoffMonth - loanB.payoffMonth;

                return (
                  <tr key={loanA.loanId} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-900 dark:text-white">
                      {loanA.lender}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                      {formatDate(loanA.payoffDate)}
                    </td>
                    <td className="py-2.5 px-4 text-cyan-600 font-bold">
                      {loanA.payoffMonth}m
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                      {formatDate(loanB.payoffDate)}
                    </td>
                    <td className="py-2.5 px-4 text-emerald-600 font-bold">
                      {loanB.payoffMonth}m
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold">
                      {diff > 0 ? (
                        <span className="text-emerald-600">-{diff}m sooner</span>
                      ) : diff < 0 ? (
                        <span className="text-cyan-600">+{Math.abs(diff)}m</span>
                      ) : (
                        <span className="text-slate-400">Same</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

