import React, { useState, useEffect } from 'react';
import { loansApi } from '../../api/endpoints/loans.api';
import { RateRevisionImpact } from '../../types';
import { formatINR } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import {
  X,
  TrendingDown,
  TrendingUp,
  Clock,
  Sparkles,
  AlertCircle,
  Loader2,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

interface RateRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: string;
  currentRate: string | number;
  currentEmi: string | number;
  onSuccess: () => void;
}

export const RateRevisionModal: React.FC<RateRevisionModalProps> = ({
  isOpen,
  onClose,
  loanId,
  currentRate,
  currentEmi,
  onSuccess,
}) => {
  const [newRate, setNewRate] = useState<string>('');
  const [policy, setPolicy] = useState<'keep_emi' | 'keep_tenure'>('keep_emi');
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  const [preview, setPreview] = useState<RateRevisionImpact | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNewRate(String(currentRate));
      setPolicy('keep_emi');
      setEffectiveDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setPreview(null);
      setPreviewError(null);
      setApplyError(null);
    }
  }, [isOpen, currentRate]);

  useEffect(() => {
    const rateVal = parseFloat(newRate);
    if (!rateVal || rateVal <= 0 || !effectiveDate) {
      setPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsPreviewLoading(true);
      setPreviewError(null);
      try {
        const res = await loansApi.previewRateRevision(loanId, {
          newRate: String(rateVal),
          policy,
          effectiveDate,
        });
        setPreview(res);
      } catch (err: any) {
        setPreview(null);
        setPreviewError(err.response?.data?.message || 'Failed to preview rate revision.');
      } finally {
        setIsPreviewLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [newRate, policy, effectiveDate, loanId]);

  if (!isOpen) return null;

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) return;
    setIsApplying(true);
    setApplyError(null);
    try {
      await loansApi.applyRateRevision(loanId, {
        newRate: String(parseFloat(newRate)),
        policy,
        effectiveDate,
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setApplyError(err.response?.data?.message || 'Failed to apply rate revision.');
    } finally {
      setIsApplying(false);
    }
  };

  const isRateCut = parseFloat(newRate) < parseFloat(String(currentRate));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isRateCut ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400'
            }`}>
              {isRateCut ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Log Floating Rate Revision
              </h2>
              <p className="text-xs text-slate-400">
                Adjust interest rate following an RBI repo rate cut or bank reset
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleApply} className="p-6 overflow-y-auto space-y-5">
          {applyError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{applyError}</span>
            </div>
          )}

          {/* Rate inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Current Interest Rate
              </label>
              <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-sm font-bold font-mono text-slate-700 dark:text-slate-300">
                {currentRate}% p.a.
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                New Interest Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                max="50"
                required
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                placeholder="e.g. 7.40"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Effective Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
              Effective Date / Installment Start
            </label>
            <input
              type="date"
              required
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Policy Choice */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Bank Adjustment Policy
              </label>
              <span className="text-[11px] text-slate-400">Indian standard default</span>
            </div>

            <div className="space-y-2">
              <label
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  policy === 'keep_emi'
                    ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <input
                  type="radio"
                  name="policy"
                  value="keep_emi"
                  checked={policy === 'keep_emi'}
                  onChange={() => setPolicy('keep_emi')}
                  className="mt-0.5 text-cyan-600"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Keep Monthly EMI Constant (Auto-contract/expand Tenure)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Maintains your monthly budget at {formatINR(Number(currentEmi))}. Rate cuts reduce your remaining months to debt-free.
                  </div>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  policy === 'keep_tenure'
                    ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <input
                  type="radio"
                  name="policy"
                  value="keep_tenure"
                  checked={policy === 'keep_tenure'}
                  onChange={() => setPolicy('keep_tenure')}
                  className="mt-0.5 text-cyan-600"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Keep Target Payoff Date (Recalculate Monthly EMI)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Maintains your exact remaining tenure and lowers your monthly cash outflow.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
              Notes / Reason (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Repo rate cut passed on by the bank"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Preview Card */}
          {isPreviewLoading ? (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 flex items-center justify-center text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-500 mr-2" />
              <span>Simulating schedule impact...</span>
            </div>
          ) : previewError ? (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs text-amber-800 dark:text-amber-300">
              {previewError}
            </div>
          ) : preview ? (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-cyan-50/40 dark:from-slate-850 dark:to-cyan-950/20 border border-cyan-200/80 dark:border-cyan-900/40 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Revision Impact Preview</span>
                </span>
                <span className="font-mono text-emerald-600 font-extrabold">
                  {Number(preview.interestSaved) >= 0
                    ? `Save ${formatINR(Number(preview.interestSaved))}`
                    : `+${formatINR(Math.abs(Number(preview.interestSaved)))} interest`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                {policy === 'keep_emi' ? (
                  <>
                    <div>
                      <div className="text-[11px] text-slate-400">Remaining Tenure</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 font-mono flex items-center gap-1">
                        <span>{preview.oldTenureMonths} mos</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="text-emerald-600">{preview.newTenureMonths} mos</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">Tenure Change</div>
                      <div className="font-bold font-mono text-emerald-600">
                        {preview.tenureDiffMonths > 0
                          ? `Reduced by ${preview.tenureDiffMonths} months!`
                          : preview.tenureDiffMonths < 0
                          ? `Extended by ${Math.abs(preview.tenureDiffMonths)} months`
                          : 'No change'}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[11px] text-slate-400">New Payoff Date</div>
                      <div className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                        {formatDate(preview.newPayoffDate)} (previously {formatDate(preview.previousPayoffDate)})
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="text-[11px] text-slate-400">Monthly EMI</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 font-mono flex items-center gap-1">
                        <span>{formatINR(Number(preview.oldEmi))}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="text-emerald-600">{formatINR(Number(preview.newEmi))}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">Monthly Relief</div>
                      <div className="font-bold font-mono text-emerald-600">
                        {formatINR(Number(preview.oldEmi) - Number(preview.newEmi))} / mo
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!preview || isApplying}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 disabled:opacity-50 cursor-pointer"
            >
              {isApplying && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Apply Rate Revision</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

