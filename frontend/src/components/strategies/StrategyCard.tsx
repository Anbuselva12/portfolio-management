import React from 'react';
import { Link } from 'react-router-dom';
import { StrategySimulationResult } from '../../types';
import { formatINR } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import {
  Sparkles,
  CheckCircle2,
  TrendingDown,
  Calendar,
  Clock,
  Sliders,
  Bookmark,
  ShieldCheck,
  Zap,
  Info,
  ExternalLink,
  Target,
} from 'lucide-react';

interface StrategyCardProps {
  strategy: StrategySimulationResult;
  isMyPlan: boolean;
  isSelectedForTimeline: boolean;
  onMarkMyPlan: () => void;
  onToggleTimeline: () => void;
  onOpenWeights?: () => void;
  isSurplusZero?: boolean;
  prepaymentMode?: 'one_off_lump_sum' | 'recurring_monthly';
}

export const StrategyCard: React.FC<StrategyCardProps> = ({
  strategy,
  isMyPlan,
  isSelectedForTimeline,
  onMarkMyPlan,
  onToggleTimeline,
  onOpenWeights,
  isSurplusZero = false,
  prepaymentMode = 'one_off_lump_sum',
}) => {
  const isAi = strategy.strategyName === 'ai_suggestion';
  const isCustom = strategy.strategyName === 'custom_weighted';
  const isOneOff = prepaymentMode === 'one_off_lump_sum';

  const interestSaved = Number(strategy.totalInterestSaved || 0);

  return (
    <div
      className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-sm ${
        isMyPlan
          ? 'border-cyan-500 bg-white dark:bg-slate-900 ring-2 ring-cyan-500/20 shadow-md'
          : isSelectedForTimeline
          ? 'border-teal-500 bg-white dark:bg-slate-900 ring-1 ring-teal-500'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <div>
        {/* Card Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black ${
                  isAi
                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
                    : isCustom
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                    : 'bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400'
                }`}
              >
                {isAi ? <Sparkles className="w-4 h-4" /> : isCustom ? <Sliders className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
              </span>

              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                  {strategy.title}
                </h3>
                {isAi && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full mt-0.5 border border-purple-200 dark:border-purple-800">
                    <Sparkles className="w-3 h-3" /> AI-generated — for guidance only
                  </span>
                )}
              </div>
            </div>

            {isMyPlan && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full">
                <Bookmark className="w-3 h-3 fill-current" /> My Plan
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {strategy.description}
          </p>

          {isCustom && onOpenWeights && (
            <button
              type="button"
              onClick={onOpenWeights}
              className="mt-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sliders className="w-3 h-3" />
              <span>Adjust scoring weights & mode</span>
            </button>
          )}

          {/* AI Rationale Paragraph */}
          {isAi && strategy.rationale && (
            <div className="mt-3 p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-200/60 dark:border-purple-900/40 text-xs text-purple-900 dark:text-purple-200 leading-relaxed">
              <span className="font-semibold block mb-0.5">Gemini Strategic Rationale:</span>
              {strategy.rationale}
            </div>
          )}
        </div>

        {/* Primary Benefit Metric Strip */}
        <div className="p-5 grid grid-cols-2 gap-3 bg-slate-50/50 dark:bg-slate-850/30 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Months to Debt-Free
            </div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {strategy.monthsToDebtFree}{' '}
              <span className="text-xs font-normal text-slate-400 font-sans">mos</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Payoff: {formatDate(strategy.payoffDate)}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Total Interest Saved
            </div>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              +{formatINR(interestSaved)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              vs. minimum payments
            </div>
          </div>
        </div>

        {/* Allocation Table */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>{isOneOff ? 'One-Off Prepayment Allocation' : 'Monthly Extra Allocations'}</span>
            <span className="text-[10px] text-slate-400 uppercase font-mono">
              {isOneOff ? 'Lump Sum' : 'Extra / mo'}
            </span>
          </div>

          {isSurplusZero ? (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>No extra surplus available. Paying minimum baseline EMIs.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {strategy.allocations.map((alloc) => {
                const extraAmt = Number(alloc.extraAmount || 0);
                const isRecipient = extraAmt > 0;
                const displayName = alloc.name || alloc.lender;
                const showSubtitle = alloc.name && alloc.name !== alloc.lender;

                return (
                  <div
                    key={alloc.loanId}
                    className={`p-3 rounded-xl border text-xs flex flex-col gap-1.5 transition-all ${
                      isRecipient
                        ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 ring-1 ring-emerald-500/30 shadow-sm'
                        : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            to={`/loans/${alloc.loanId}`}
                            className="font-bold text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 hover:underline flex items-center gap-1 text-xs"
                            title="Open loan details & execute prepayment"
                          >
                            <span>{displayName}</span>
                            <ExternalLink className="w-3 h-3 text-cyan-600 opacity-60 hover:opacity-100 shrink-0" />
                          </Link>
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {alloc.type}
                          </span>
                          {isRecipient && (
                            extraAmt >= Number(alloc.currentPrincipal) ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700 dark:text-emerald-200" /> Fully Paid Off!
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                                <Target className="w-2.5 h-2.5" /> Prepay Target
                              </span>
                            )
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 flex-wrap">
                          {showSubtitle && <span>{alloc.lender}</span>}
                          {alloc.placeOrPurpose && (
                            <span className="text-slate-400 dark:text-slate-500">
                              • {alloc.placeOrPurpose}
                            </span>
                          )}
                          <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">
                            • {alloc.interestRate}% APR
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-mono font-bold ${
                            isRecipient
                              ? 'text-emerald-700 dark:text-emerald-400 text-sm'
                              : 'text-slate-400 text-xs'
                          }`}
                        >
                          +{formatINR(extraAmt)}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          Total: {formatINR(alloc.totalMonthlyPayment)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60 font-mono">
                      <span>
                        Bal: <strong className="text-slate-700 dark:text-slate-300">{formatINR(alloc.currentPrincipal)}</strong> • Min EMI: {formatINR(alloc.minimumEmi)}
                      </span>
                      {isRecipient && (
                        <Link
                          to={`/loans/${alloc.loanId}`}
                          className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 flex items-center gap-0.5"
                        >
                          <span>Execute Prepayment →</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="p-4 bg-slate-50 dark:bg-slate-850/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={isSelectedForTimeline}
            onChange={onToggleTimeline}
            className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
          />
          <span>Overlay on Timeline</span>
        </label>

        <button
          type="button"
          onClick={onMarkMyPlan}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            isMyPlan
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>{isMyPlan ? 'My Active Plan' : 'Mark as My Plan'}</span>
        </button>
      </div>
    </div>
  );
};

