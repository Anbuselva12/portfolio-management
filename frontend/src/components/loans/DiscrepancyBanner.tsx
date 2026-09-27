import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, X, Sparkles } from 'lucide-react';
import { formatINR } from '../../utils/currency';

interface DiscrepancyBannerProps {
  calculatedEmi: string | number;
  userEmi: string | number;
  diffPct: number;
  impliedRate?: string | number | null;
}

export const DiscrepancyBanner: React.FC<DiscrepancyBannerProps> = ({
  calculatedEmi,
  userEmi,
  diffPct,
  impliedRate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/40 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                EMI Discrepancy Calibrated ({diffPct}% difference)
              </h4>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-200/60 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" /> Auto-reconciled
              </span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 max-w-2xl leading-relaxed">
              Your stated EMI of <strong className="font-mono">{formatINR(userEmi)}</strong> differs from the theoretical reducing-balance EMI (<span className="font-mono">{formatINR(calculatedEmi)}</span>). The schedule is amortized using your actual EMI figure so your cash outflow remains precise.
            </p>

            {isExpanded && (
              <div className="mt-3 p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">User Provided EMI</div>
                    <div className="font-bold font-mono text-slate-900 dark:text-white">{formatINR(userEmi)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Standard Formula EMI</div>
                    <div className="font-bold font-mono text-slate-900 dark:text-white">{formatINR(calculatedEmi)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Variance</div>
                    <div className="font-bold font-mono text-amber-600">{diffPct}%</div>
                  </div>
                  {impliedRate && (
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Solved Implied Rate (APR)</div>
                      <div className="font-bold font-mono text-cyan-600">{impliedRate}% p.a.</div>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Solved using the Newton-Raphson polynomial solver per SDD §7.3. The repayment schedule closes to exactly ₹0.00.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <span>{isExpanded ? 'Less' : 'Details'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

