import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CalendarPlus, CheckCircle2, Loader2, X } from 'lucide-react';
import { incomeApi } from '../../api/endpoints/income.api';
import { IncomeEntry } from '../../types';
import { Portal } from '../ui/Portal';

const inputClass =
  'w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

const currentYearMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const previousYearMonth = (): string => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** Receipt date defaulting to the stream's due day within the chosen month. */
const defaultReceivedDate = (yearMonth: string, dueDay: number): string => {
  const [y, m] = yearMonth.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${yearMonth}-${String(Math.min(Math.max(dueDay, 1), lastDay)).padStart(2, '0')}`;
};

interface RecordReceiptModalProps {
  income: IncomeEntry;
  onClose: () => void;
  /** Called after each saved receipt so the caller can refresh. */
  onSaved: () => void;
}

/**
 * Records money received for any current or past month of a recurring stream, including months from
 * before the stream was set up in the app. Saving a month that already has a receipt replaces it.
 */
export const RecordReceiptModal: React.FC<RecordReceiptModalProps> = ({ income, onClose, onSaved }) => {
  const dueDay = Number(((income as any).due_day_of_month ?? new Date(income.startDate).getDate()) || 1);
  const [yearMonth, setYearMonth] = useState(previousYearMonth());
  const [amount, setAmount] = useState(income.amount);
  const [receivedDate, setReceivedDate] = useState(defaultReceivedDate(previousYearMonth(), dueDay));
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    dialogRef.current?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSaving, onClose]);

  const changeMonth = (value: string) => {
    setYearMonth(value);
    if (value) setReceivedDate(defaultReceivedDate(value, dueDay));
  };

  const handleSave = async () => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) {
      setError('Choose the month the money was received for');
      return;
    }
    if (yearMonth > currentYearMonth()) {
      setError('Only the current and past months can be recorded');
      return;
    }
    if (amount.trim() === '' || isNaN(Number(amount)) || Number(amount) < 0) {
      setError('Enter the amount received');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await incomeApi.confirmReceipt(income.id, yearMonth, {
        receivedAmount: Number(amount),
        receivedDate: new Date(`${receivedDate}T00:00:00.000Z`).toISOString(),
        notes: notes.trim() || undefined,
      });
      setSaved((prev) => [...prev, yearMonth]);
      onSaved();
      // Ready for the next missing month
      const [y, m] = yearMonth.split('-').map(Number);
      const prev = new Date(Date.UTC(y, m - 2, 1));
      changeMonth(`${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`);
      setNotes('');
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || 'Failed to record the receipt');
    } finally {
      setIsSaving(false);
    }
  };

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
        aria-labelledby="record-receipt-title"
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 my-auto max-h-[92dvh] overflow-y-auto space-y-5 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="record-receipt-title" className="text-lg font-bold text-slate-900 dark:text-white">
                Record a past receipt
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 break-words">{income.label}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Add income you received before this app tracked it. Pick the month and the amount; it then appears in
          Transactions, totals and project returns. Recording a month that already has a receipt replaces it.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="rr-month" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Month</label>
            <input
              id="rr-month"
              type="month"
              max={currentYearMonth()}
              className={inputClass}
              value={yearMonth}
              onChange={(e) => changeMonth(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="rr-amount" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Amount received ({income.currency})
            </label>
            <input
              id="rr-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className={inputClass}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="rr-date" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Received on</label>
            <input id="rr-date" type="date" className={inputClass} value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
          </div>
          <div>
            <label htmlFor="rr-notes" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Notes (optional)</label>
            <input id="rr-notes" className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        {saved.length > 0 && (
          <div role="status" className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Recorded: {saved.join(', ')}. The month is set to the one before, ready for the next.</span>
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
            className="min-h-[44px] px-5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            {saved.length > 0 ? 'Done' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="min-h-[44px] px-5 text-sm font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Record receipt
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
};
