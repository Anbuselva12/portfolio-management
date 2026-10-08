import React from 'react';
import { Loan } from '../../types';
import { CheckCircle2, Sparkles, X, ShieldCheck } from 'lucide-react';

export interface ZeroBalancePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan;
  onProceedToClose: () => void;
}

export const ZeroBalancePromptModal: React.FC<ZeroBalancePromptModalProps> = ({
  isOpen,
  onClose,
  loan,
  onProceedToClose,
}) => {
  if (!isOpen) return null;

  const loanName = (loan as any).name || loan.lender || 'Loan';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 text-center">
        {/* Celebration Icon */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Zero Dues Pending</span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
            All Dues Cleared! 🎉
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
            All installments and outstanding balances on <strong className="text-slate-900 dark:text-white">{loanName}</strong> have been settled.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
            Closing this loan locks future amount additions, stops automatic EMI expenses, and marks your loan status as settled in your dashboard.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px]"
          >
            Keep Active / Later
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onProceedToClose();
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20 transition-all cursor-pointer min-h-[44px]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Yes, Close Loan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
