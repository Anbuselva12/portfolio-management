import React, { useState, useEffect } from 'react';
import { loansApi } from '../../api/endpoints/loans.api';
import { formatINR } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import {
  X,
  PlusCircle,
  Clock,
  Sparkles,
  AlertCircle,
  Loader2,
  ArrowRight,
  Info,
  DollarSign,
} from 'lucide-react';

interface PartPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: string;
  currentRate: string | number;
  currentEmi: string | number;
  onSuccess: () => void;
}

export const PartPaymentModal: React.FC<PartPaymentModalProps> = ({
  isOpen,
  onClose,
  loanId,
  currentRate,
  currentEmi,
  onSuccess,
}) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState<'reduce_tenure' | 'reduce_emi'>('reduce_tenure');
  const [accruedInterest, setAccruedInterest] = useState('');
  const [notes, setNotes] = useState('');

  const [preview, setPreview] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [brokenInterestInfo, setBrokenInterestInfo] = useState<any>(null);
  const [isBrokenInterestLoading, setIsBrokenInterestLoading] = useState(false);

  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setMode('reduce_tenure');
      setAccruedInterest('');
      setNotes('');
      setPreview(null);
      setPreviewError(null);
      setApplyError(null);
      fetchBrokenInterest(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, loanId]);

  const fetchBrokenInterest = async (paymentDate: string) => {
    if (!paymentDate) return;
    setIsBrokenInterestLoading(true);
    try {
      const info = await loansApi.getBrokenInterest(loanId, paymentDate);
      setBrokenInterestInfo(info);
      if (!accruedInterest && info.estimatedBrokenPeriodInterest) {
        setAccruedInterest(String(Number(info.estimatedBrokenPeriodInterest)));
      }
    } catch {
      setBrokenInterestInfo(null);
    } finally {
      setIsBrokenInterestLoading(false);
    }
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    fetchBrokenInterest(newDate);
  };

  useEffect(() => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0 || !date) {
      setPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsPreviewLoading(true);
      setPreviewError(null);
      try {
        const res = await loansApi.previewPrepayment(loanId, {
          amount: String(numAmount),
          date,
          mode,
          accruedInterest: accruedInterest ? String(parseFloat(accruedInterest)) : undefined,
          notes: notes.trim() || undefined,
        });
        setPreview(res);
      } catch (err: any) {
        setPreview(null);
        setPreviewError(err.response?.data?.message || 'Failed to preview part-payment.');
      } finally {
        setIsPreviewLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [amount, date, mode, accruedInterest, notes, loanId]);

  if (!isOpen) return null;

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) return;
    setIsApplying(true);
    setApplyError(null);
    try {
      await loansApi.applyPrepayment(loanId, {
        amount: String(parseFloat(amount)),
        date,
        mode,
        accruedInterest: accruedInterest ? String(parseFloat(accruedInterest)) : undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setApplyError(err.response?.data?.message || 'Failed to record part payment.');
    } finally {
      setIsApplying(false);
    }
  };

  const totalCashOutflow = (parseFloat(amount) || 0) + (parseFloat(accruedInterest) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Record Part-Payment
              </h2>
              <p className="text-xs text-slate-400">
                Lump sum principal reduction with broken-period interest adjustment
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

        {/* Form Body */}
        <form onSubmit={handleApply} className="p-6 overflow-y-auto space-y-4">
          {applyError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{applyError}</span>
            </div>
          )}

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Principal Amount (₹)
              </label>
              <input
                type="number"
                step="1"
                min="1000"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 100000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Broken Period / Accrued Simple Interest Field */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-750 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Accrued / Broken-Period Interest (₹)
              </label>
              {brokenInterestInfo?.days > 0 && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {brokenInterestInfo.days} days elapsed since last EMI
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.01"
                min="0"
                value={accruedInterest}
                onChange={(e) => setAccruedInterest(e.target.value)}
                placeholder="e.g. 120"
                className="w-36 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex-1 leading-snug">
                Banks (like HDFC) charge simple interest for days between your last EMI date and part-payment date (e.g. ₹120). Enter the exact amount your bank quoted.
              </span>
            </div>
          </div>

          {/* Total Cash Outflow Summary Pill */}
          {parseFloat(amount) > 0 && (
            <div className="px-4 py-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-900/40 flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Total Cash Paid to Bank:</span>
              <span className="font-mono font-extrabold text-cyan-700 dark:text-cyan-300">
                {formatINR(totalCashOutflow)}
                <span className="text-[10px] text-slate-400 font-normal ml-1">
                  ({formatINR(parseFloat(amount) || 0)} principal + {formatINR(parseFloat(accruedInterest) || 0)} interest)
                </span>
              </span>
            </div>
          )}

          {/* Mode Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Prepayment Strategy
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  mode === 'reduce_tenure'
                    ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="partMode"
                  value="reduce_tenure"
                  checked={mode === 'reduce_tenure'}
                  onChange={() => setMode('reduce_tenure')}
                  className="mt-0.5 text-cyan-600"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Reduce Tenure</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Keep EMI fixed, finish early (Recommended)</div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  mode === 'reduce_emi'
                    ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="partMode"
                  value="reduce_emi"
                  checked={mode === 'reduce_emi'}
                  onChange={() => setMode('reduce_emi')}
                  className="mt-0.5 text-cyan-600"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Reduce Monthly EMI</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Keep tenure, lower monthly cash outflow</div>
                </div>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. HDFC part payment via net banking ref #12345"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Impact Preview */}
          {isPreviewLoading ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center justify-center text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-500 mr-2" />
              <span>Calculating prepayment benefit...</span>
            </div>
          ) : previewError ? (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs text-amber-800 dark:text-amber-300">
              {previewError}
            </div>
          ) : preview ? (
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/50 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-900/40 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Financial Impact</span>
                </span>
                <span className="font-mono text-emerald-600 font-extrabold">
                  Save {formatINR(Number(preview.interestSaved))} in interest
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-900/40 text-xs">
                {mode === 'reduce_tenure' ? (
                  <>
                    <div>
                      <div className="text-[11px] text-slate-400">Tenure Shortened</div>
                      <div className="font-bold text-emerald-600 font-mono">
                        {preview.tenureReducedMonths} months early!
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">New Payoff Date</div>
                      <div className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                        {formatDate(preview.newPayoffDate)}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="text-[11px] text-slate-400">New Monthly EMI</div>
                      <div className="font-bold text-emerald-600 font-mono">
                        {formatINR(Number(preview.newEmi))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">Monthly Savings</div>
                      <div className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                        {formatINR(Number(currentEmi) - Number(preview.newEmi))} / mo
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
            >
              {isApplying && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Confirm & Apply Part-Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

