import React, { useState, useEffect } from 'react';
import { SlideDrawer } from '../ui/SlideDrawer';
import { loansApi } from '../../api/endpoints/loans.api';
import { Loan } from '../../types';
import { formatINR } from '../../utils/currency';
import {
  Calculator,
  Calendar,
  Clock,
  PiggyBank,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingDown,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface PrepaymentCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan;
  onPrepaymentApplied: () => void;
}

export const PrepaymentCalculatorModal: React.FC<PrepaymentCalculatorModalProps> = ({
  isOpen,
  onClose,
  loan,
  onPrepaymentApplied,
}) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState<'reduce_tenure' | 'reduce_emi'>('reduce_tenure');

  const [preview, setPreview] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trigger preview fetch when inputs change with debounce
  useEffect(() => {
    if (!isOpen || !amount || Number(amount) <= 0) {
      setPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingPreview(true);
      setError(null);
      try {
        const res = await loansApi.previewPrepayment(loan.id, {
          amount,
          date,
          mode,
        });
        setPreview(res);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Could not calculate preview.');
        setPreview(null);
      } finally {
        setIsLoadingPreview(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [amount, date, mode, isOpen, loan.id]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('Please specify a prepayment amount.');
      return;
    }

    setIsApplying(true);
    setError(null);
    try {
      await loansApi.applyPrepayment(loan.id, {
        amount,
        date,
        mode,
      });
      alert('Prepayment successfully applied! Your repayment schedule has been updated.');
      onPrepaymentApplied();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to apply prepayment.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <SlideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Prepayment & Foreclosure Calculator"
    >
      <form onSubmit={handleApply} className="space-y-6">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Simulate making a lump-sum principal prepayment on <strong>{loan.lender} ({loan.type})</strong> to evaluate interest savings and payoff timeline changes.
        </p>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Extra Prepayment Amount (₹) *
            </label>
            <input
              type="number"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 100000"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Payment Date *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Optimization Strategy *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('reduce_tenure')}
                className={`p-3 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                  mode === 'reduce_tenure'
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-200 ring-2 ring-cyan-500/20'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="font-bold mb-0.5">Reduce Tenure</div>
                <div className="text-[11px] opacity-80">Keep monthly EMI same, become debt-free faster (Max Interest Saved).</div>
              </button>

              <button
                type="button"
                onClick={() => setMode('reduce_emi')}
                className={`p-3 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                  mode === 'reduce_emi'
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-200 ring-2 ring-cyan-500/20'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="font-bold mb-0.5">Reduce Monthly EMI</div>
                <div className="text-[11px] opacity-80">Keep tenure fixed, lower monthly cash outflow starting next month.</div>
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview Panel */}
        {isLoadingPreview && (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
            <span>Calculating amortization impact...</span>
          </div>
        )}

        {preview && !isLoadingPreview && (
          <div className="p-5 bg-gradient-to-br from-cyan-500/10 via-teal-500/5 to-transparent rounded-2xl border border-cyan-500/30 space-y-4 animate-in fade-in">
            <div className="text-xs font-bold text-cyan-900 dark:text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Projected What-If Benefit</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Gross Interest Saved</div>
                <div className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  +{formatINR(preview.interestSaved)}
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Net Benefit (after penalty)</div>
                <div className="text-base font-extrabold font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
                  +{formatINR(preview.netBenefit)}
                </div>
              </div>
            </div>

            {/* Strategy Specific Delta */}
            <div className="p-3 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
              {mode === 'reduce_tenure' ? (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Tenure Reduction:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    -{preview.tenureReducedMonths} months sooner!
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">New Monthly EMI:</span>
                  <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {formatINR(preview.newEmi)}/mo (was {formatINR(preview.previousEmi)})
                  </span>
                </div>
              )}

              {Number(preview.penaltyAmount) > 0 && (
                <div className="flex items-center justify-between text-rose-500">
                  <span>Prepayment Penalty:</span>
                  <span className="font-mono">-{formatINR(preview.penaltyAmount)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isApplying || !preview}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-50 shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
          >
            {isApplying && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Apply This Prepayment</span>
          </button>
        </div>
      </form>
    </SlideDrawer>
  );
};
