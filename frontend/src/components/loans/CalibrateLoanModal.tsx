import React, { useState, useEffect } from 'react';
import { loansApi } from '../../api/endpoints/loans.api';
import { formatINR } from '../../utils/currency';
import {
  X,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HelpCircle,
} from 'lucide-react';

interface CalibrateLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: string;
  defaultPrincipal: string | number;
  defaultRate: string | number;
  defaultTenure: number;
  defaultEmi: string | number;
  onSuccess: () => void;
}

export const CalibrateLoanModal: React.FC<CalibrateLoanModalProps> = ({
  isOpen,
  onClose,
  loanId,
  defaultPrincipal,
  defaultRate,
  defaultTenure,
  defaultEmi,
  onSuccess,
}) => {
  const [currentOutstanding, setCurrentOutstanding] = useState('');
  const [remainingTenure, setRemainingTenure] = useState<number>(0);
  const [currentRate, setCurrentRate] = useState('');
  const [emiAmount, setEmiAmount] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentOutstanding(String(defaultPrincipal));
      setRemainingTenure(defaultTenure);
      setCurrentRate(String(defaultRate));
      setEmiAmount(String(defaultEmi));
      setEffectiveDate(new Date().toISOString().split('T')[0]);
      setError(null);
    }
  }, [isOpen, defaultPrincipal, defaultRate, defaultTenure, defaultEmi]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOutstanding || !remainingTenure || !currentRate || !emiAmount) {
      setError('Please fill in all required statement parameters.');
      return;
    }

    setIsCalibrating(true);
    setError(null);
    try {
      await loansApi.calibrate(loanId, {
        currentOutstanding: String(parseFloat(currentOutstanding)),
        remainingTenureMonths: Number(remainingTenure),
        currentRate: String(parseFloat(currentRate)),
        emiAmount: String(parseFloat(emiAmount)),
        effectiveDate,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to calibrate loan.');
    } finally {
      setIsCalibrating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Sync to Bank Statement
              </h2>
              <p className="text-xs text-slate-400">
                Calibrate directly with your latest HDFC / bank statement figures
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/40 text-xs text-teal-800 dark:text-teal-300 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Use this if your loan is already ongoing and you want to match your bank's exact current numbers (e.g. ₹34,39,456 balance, 129 remaining months at 7.4%). All forward installments will be generated from today with your exact EMI.
            </span>
          </div>

          {/* Current Outstanding */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
              Current Outstanding Principal (₹)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={currentOutstanding}
              onChange={(e) => setCurrentOutstanding(e.target.value)}
              placeholder="e.g. 3439456"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Remaining Months */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Remaining Tenure (Months)
              </label>
              <input
                type="number"
                min="1"
                max="480"
                required
                value={remainingTenure || ''}
                onChange={(e) => setRemainingTenure(parseInt(e.target.value, 10) || 0)}
                placeholder="e.g. 129"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Current Interest Rate */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Current Rate (% p.a.)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={currentRate}
                onChange={(e) => setCurrentRate(e.target.value)}
                placeholder="e.g. 7.40"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Monthly EMI Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Fixed Monthly EMI (₹)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={emiAmount}
                onChange={(e) => setEmiAmount(e.target.value)}
                placeholder="e.g. 38848"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* As-Of Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                Effective As-Of Date
              </label>
              <input
                type="date"
                required
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

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
              disabled={isCalibrating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 disabled:opacity-50 cursor-pointer"
            >
              {isCalibrating && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Sync & Re-generate Schedule</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

