import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { Portal } from '../ui/Portal';

export interface RemovalImpact {
  assets: number;
  incomes: number;
  receipts: number;
  loans: number;
  expenses: number;
  insurance: number;
  projectExpenses: number;
}

interface RemovalConfirmModalProps {
  /** "remove" when an admin removes someone, "leave" when the signed-in member leaves. */
  mode: 'remove' | 'leave';
  personName: string;
  loadImpact: () => Promise<RemovalImpact>;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

const ROWS: Array<[keyof RemovalImpact, string]> = [
  ['assets', 'Assets'],
  ['incomes', 'Income streams'],
  ['receipts', 'Income receipts'],
  ['loans', 'Loans (with schedules and payments)'],
  ['expenses', 'Household expenses'],
  ['insurance', 'Insurance policies'],
  ['projectExpenses', 'Project expenses they entered'],
];

/** Shows exactly what will be deleted before a member is removed or leaves, then asks for confirmation. */
export const RemovalConfirmModal: React.FC<RemovalConfirmModalProps> = ({ mode, personName, loadImpact, onConfirm, onClose }) => {
  const [impact, setImpact] = useState<RemovalImpact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Load once per opening; the loader may be an inline function in the caller.
  const loadRef = useRef(loadImpact);
  useEffect(() => {
    loadRef
      .current()
      .then(setImpact)
      .catch((err) => setError(err?.response?.data?.message || 'Could not load what would be removed'));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isWorking) onClose();
    };
    window.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [isWorking, onClose]);

  const confirm = async () => {
    setIsWorking(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err: any) {
      const m = err?.response?.data?.message;
      setError(Array.isArray(m) ? m.join(', ') : m || 'The change could not be completed');
      setIsWorking(false);
    }
  };

  const total = impact ? Object.values(impact).reduce((a, b) => a + b, 0) : 0;
  const title = mode === 'leave' ? 'Leave this family?' : `Remove ${personName}?`;

  return (
    <Portal>
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isWorking) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="removal-title"
        aria-describedby="removal-desc"
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 my-auto max-h-[92dvh] overflow-y-auto space-y-5 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="removal-title" className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
              <p id="removal-desc" className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {mode === 'leave'
                  ? 'Everything you added to this family is permanently deleted, and you are signed out. The family admin is notified.'
                  : `Everything ${personName} added is permanently deleted and they are signed out. This cannot be undone.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isWorking}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {!impact && !error && (
            <div className="p-4 text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Checking what will be deleted…</div>
          )}
          {impact &&
            ROWS.map(([key, label]) => (
              <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-slate-600 dark:text-slate-300">{label}</span>
                <span className={`font-bold tabular-nums ${impact[key] ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>{impact[key]}</span>
              </div>
            ))}
        </div>
        {impact && total === 0 && <p className="text-xs text-slate-500">Nothing to delete — only the membership is removed.</p>}

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs sm:text-sm">{error}</div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isWorking}
            className="min-h-[44px] px-5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={isWorking || !impact}
            className="min-h-[44px] px-5 text-sm font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {isWorking && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'leave' ? 'Leave and delete my data' : 'Remove and delete their data'}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
};
