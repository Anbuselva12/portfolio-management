import React, { useState } from 'react';
import { Loan } from '../../types';
import { formatINR } from '../../utils/currency';
import {
  X,
  CheckCircle2,
  Building2,
  Zap,
  Gem,
  Gift,
  HelpCircle,
  Calendar,
  FileText,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export interface CloseLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan;
  currentOutstanding: number;
  onConfirmClose: (data: { closureReason?: string; closureNotes?: string; closedAt?: string }) => Promise<void>;
}

const CLOSURE_REASONS = [
  {
    id: 'Full Closure with Money',
    title: 'Full Closure with Money',
    desc: 'Paid off in full using personal savings, bonus, or income',
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
  },
  {
    id: 'Transfer to new bank',
    title: 'Transfer to new bank',
    desc: 'Balance transfer or loan refinancing with another bank/NBFC',
    icon: Building2,
    color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800',
  },
  {
    id: 'Foreclosure / Prepayment',
    title: 'Foreclosure / Prepayment',
    desc: 'Early lump-sum principal payoff prior to original tenure end',
    icon: Zap,
    color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
  },
  {
    id: 'Asset Sale / Collateral Liquidation',
    title: 'Asset Sale / Collateral Liquidation',
    desc: 'Financed property/car sold or pledged gold ornaments retrieved',
    icon: Gem,
    color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800',
  },
  {
    id: 'Waived / Written Off',
    title: 'Waived / Written Off',
    desc: 'Government subsidy, interest waiver, or lender concession',
    icon: Gift,
    color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800',
  },
  {
    id: 'Others',
    title: 'Others',
    desc: 'Custom settlement scenario or unspecified closure reason',
    icon: HelpCircle,
    color: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700',
  },
];

export const CloseLoanModal: React.FC<CloseLoanModalProps> = ({
  isOpen,
  onClose,
  loan,
  currentOutstanding,
  onConfirmClose,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [closureNotes, setClosureNotes] = useState<string>('');
  const [closedAt, setClosedAt] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirmClose({
        closureReason: selectedReason || undefined,
        closureNotes: closureNotes.trim() || undefined,
        closedAt,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to close loan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loanName = (loan as any).name || loan.lender || 'Loan';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 my-auto max-h-[92vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Close Loan</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {loanName} • {loan.lender} ({loan.type})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Outstanding status box */}
        <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
          currentOutstanding > 0
            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
        }`}>
          {currentOutstanding > 0 ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            <div className="font-bold flex items-center justify-between gap-2">
              <span>{currentOutstanding > 0 ? 'Remaining Balance' : 'All Dues Cleared'}</span>
              <span className="font-mono text-sm">{formatINR(currentOutstanding)}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              {currentOutstanding > 0
                ? 'Closing will mark this loan as fully closed. No further EMIs or payments can be recorded after closure.'
                : 'Zero balance remaining! Closing will officially mark this loan as settled in your portfolio.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reason Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Reason for Full Closure
              </label>
              <span className="text-[11px] font-semibold text-slate-400">Optional</span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
              Choose an applicable reason below, or leave unselected to close directly.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CLOSURE_REASONS.map((r) => {
                const Icon = r.icon;
                const isSelected = selectedReason === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedReason(isSelected ? '' : r.id)}
                    className={`flex items-start gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer min-h-[58px] ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className={`p-1.5 rounded-xl border shrink-0 ${r.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        {r.title}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {r.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedReason && (
              <button
                type="button"
                onClick={() => setSelectedReason('')}
                className="mt-2 text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline cursor-pointer"
              >
                Clear selected reason
              </button>
            )}
          </div>

          {/* Closure Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Closure Date
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={closedAt}
                onChange={(e) => setClosedAt(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Closure Notes / Remarks <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <div className="relative">
              <textarea
                rows={2}
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                placeholder="e.g. NOC received from bank, reference #CLOS-9812..."
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Closing Loan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Loan Closure</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
