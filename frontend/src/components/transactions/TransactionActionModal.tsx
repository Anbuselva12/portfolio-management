import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { TransactionItem } from '../../api/endpoints/transactions.api';
import { incomeApi } from '../../api/endpoints/income.api';
import { expensesApi } from '../../api/endpoints/expenses.api';
import { loansApi } from '../../api/endpoints/loans.api';
import { Portal } from '../ui/Portal';

export type TransactionActionMode = 'edit' | 'delete';

export interface TransactionCapabilities {
  canEdit: boolean;
  canDelete: boolean;
  /** Label of the destructive action, which differs by what the source record is. */
  deleteLabel: string;
  /** What deleting does to the source, shown in the confirmation. */
  deleteEffect: string;
  /** Why the row cannot be changed here. */
  lockedReason?: string;
}

/** What can be done to a transaction row, and how it reflects back on its source record. */
export const getTransactionCapabilities = (tx: TransactionItem): TransactionCapabilities => {
  switch (tx.type) {
    case 'income_one_off':
      return {
        canEdit: true,
        canDelete: true,
        deleteLabel: 'Delete income',
        deleteEffect: 'The income entry is removed from Income and from every total and project return.',
      };
    case 'income_recurring':
      return {
        canEdit: true,
        canDelete: true,
        deleteLabel: 'Undo receipt',
        deleteEffect: 'The month goes back to "pending" in the home-page reminders, and the amount leaves your totals.',
      };
    case 'expense_household':
      return {
        canEdit: true,
        canDelete: true,
        deleteLabel: 'Delete expense',
        deleteEffect: 'The expense is removed from Expenses and from every total.',
      };
    case 'loan_emi':
      return {
        canEdit: true,
        canDelete: true,
        deleteLabel: 'Mark EMI unpaid',
        deleteEffect: 'The instalment returns to "unpaid" on the loan schedule and in reminders; outstanding is recalculated.',
      };
    case 'loan_prepayment':
    case 'gold_loan_payment':
      return {
        canEdit: false,
        canDelete: true,
        deleteLabel: 'Delete payment',
        deleteEffect: 'The payment is removed from the loan, and its outstanding balance and schedule are recalculated.',
        lockedReason: 'Delete this payment and add it again to change it.',
      };
    default:
      return {
        canEdit: false,
        canDelete: false,
        deleteLabel: '',
        deleteEffect: '',
        lockedReason: 'Insurance premiums are managed from the Insurance page.',
      };
  }
};

const inputClass =
  'w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500';

const toDateInput = (iso: string): string => iso.slice(0, 10);
const toIso = (dateInput: string): string => new Date(`${dateInput}T00:00:00.000Z`).toISOString();

interface TransactionActionModalProps {
  tx: TransactionItem;
  mode: TransactionActionMode;
  onClose: () => void;
  /** Called after a successful change so the caller can refresh. */
  onDone: () => void;
}

/** Edit or delete one transaction; the change is applied to the record the row came from. */
export const TransactionActionModal: React.FC<TransactionActionModalProps> = ({ tx, mode, onClose, onDone }) => {
  const caps = getTransactionCapabilities(tx);
  const [label, setLabel] = useState(tx.label ?? '');
  const [amount, setAmount] = useState(tx.amount);
  const [date, setDate] = useState(toDateInput(tx.date));
  const [notes, setNotes] = useState(tx.notes ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    dialogRef.current?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSaving, onClose]);

  const showAmount = tx.type !== 'loan_emi';
  const showNotes = tx.type === 'income_recurring' || tx.type === 'expense_household';
  const showLabel = tx.type === 'income_one_off';
  const loanId = tx.tagTarget?.id ?? '';

  const validate = (): string | null => {
    if (showAmount && (amount.trim() === '' || isNaN(Number(amount)) || Number(amount) <= 0)) {
      return 'Enter an amount greater than zero';
    }
    if (!date) return 'Choose a date';
    if (showLabel && !label.trim()) return 'Enter a name for the income';
    return null;
  };

  const applyEdit = async () => {
    if (tx.type === 'income_one_off') {
      await incomeApi.update(tx.rawEntityId, { label: label.trim(), amount: Number(amount), startDate: toIso(date) });
    } else if (tx.type === 'income_recurring') {
      await incomeApi.updateReceipt(tx.rawEntityId, { receivedAmount: Number(amount), receivedDate: toIso(date), notes });
    } else if (tx.type === 'expense_household') {
      await expensesApi.update(tx.rawEntityId, { amount: Number(amount), date: toIso(date), notes });
    } else if (tx.type === 'loan_emi') {
      await loansApi.updateInstallment(loanId, tx.rawEntityId, { paidDate: toIso(date) });
    }
  };

  const applyDelete = async () => {
    if (tx.type === 'income_one_off') await incomeApi.remove(tx.rawEntityId);
    else if (tx.type === 'income_recurring') await incomeApi.revertReceipt(tx.rawEntityId);
    else if (tx.type === 'expense_household') await expensesApi.remove(tx.rawEntityId);
    else if (tx.type === 'loan_emi') await loansApi.updateInstallment(loanId, tx.rawEntityId, { isPaid: false });
    else if (tx.type === 'loan_prepayment') await loansApi.deletePrepayment(loanId, tx.rawEntityId);
    else if (tx.type === 'gold_loan_payment') await loansApi.deleteGoldLoanPayment(loanId, tx.rawEntityId);
  };

  const save = async () => {
    const problem = mode === 'edit' ? validate() : null;
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      if (mode === 'edit') await applyEdit();
      else await applyDelete();
      onDone();
      onClose();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || 'The change could not be saved');
    } finally {
      setIsSaving(false);
    }
  };

  const isDelete = mode === 'delete';

  return (
    <Portal>
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-action-title"
        className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full border border-gray-200 dark:border-gray-800 shadow-2xl p-5 sm:p-7 my-auto max-h-[92dvh] overflow-y-auto space-y-5 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                isDelete ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
              }`}
            >
              {isDelete ? <Trash2 className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 id="tx-action-title" className="text-lg font-bold text-gray-900 dark:text-white">
                {isDelete ? caps.deleteLabel : 'Edit transaction'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 break-words">{tx.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isDelete ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">{caps.deleteEffect}</p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Changes are applied to the original record, so Income, Loans, Expenses, reminders and project returns all stay in step.
            </p>
            {showLabel && (
              <div>
                <label htmlFor="tx-label" className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Name</label>
                <input id="tx-label" className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
            )}
            {showAmount && (
              <div>
                <label htmlFor="tx-amount" className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  Amount ({tx.currency})
                </label>
                <input
                  id="tx-amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            )}
            <div>
              <label htmlFor="tx-date" className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                {tx.type === 'loan_emi' ? 'Paid on' : 'Date'}
              </label>
              <input id="tx-date" type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            {showNotes && (
              <div>
                <label htmlFor="tx-notes" className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Notes</label>
                <input id="tx-notes" className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            )}
            {tx.type === 'loan_emi' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                The EMI amount follows the loan schedule. To change an amount, adjust the loan itself.
              </p>
            )}
          </div>
        )}

        {error && (
          <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="min-h-[44px] px-5 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isSaving}
            className={`min-h-[44px] px-5 text-sm font-bold rounded-xl text-white inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ${
              isDelete ? 'bg-rose-600 hover:bg-rose-700' : 'bg-cyan-600 hover:bg-cyan-700'
            }`}
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isDelete ? caps.deleteLabel : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
};
