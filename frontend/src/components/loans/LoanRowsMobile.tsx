import React from 'react';
import { AlertTriangle, Tag, Trash2, type LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { formatINR } from '../../utils/currency';

export interface LoanRowData {
  id: string;
  name: string;
  subtitle: string;
  icon: LucideIcon;
  isGold: boolean;
  isClosed: boolean;
  outstanding: number;
  /** 0–100, share of the original principal already repaid. */
  paidPercent: number;
  rate: string;
  emi: number | null;
  remainingMonths: number;
  reconciled: boolean;
  projectNames: string[];
}

interface LoanRowsMobileProps {
  rows: LoanRowData[];
  onOpen: (id: string) => void;
  onDelete: (e: React.MouseEvent, id: string, name: string) => void;
  onTagProject: (id: string, label: string) => void;
}

const tenureLabel = (months: number, isGold: boolean): string => {
  if (months === 0) return isGold ? 'Due for payoff' : 'Matures this month';
  return `${months} mo left`;
};

/** Phone-only compact loan list; each row opens the loan summary. The card grid is used from `md` up. */
export const LoanRowsMobile: React.FC<LoanRowsMobileProps> = ({ rows, onOpen, onDelete, onTagProject }) => (
  <ul className="md:hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
    {rows.map((row) => {
      const Icon = row.icon;
      return (
        <li key={row.id}>
          <div
            role="link"
            tabIndex={0}
            onClick={() => onOpen(row.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen(row.id);
              }
            }}
            aria-label={`Open ${row.name}`}
            className="flex gap-3 px-3.5 py-3 active:bg-slate-50 dark:active:bg-slate-800/60 cursor-pointer"
          >
            <span
              className={clsx(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                row.isGold
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  : 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400',
              )}
            >
              <Icon className="w-5 h-5" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{row.name}</span>
                <span
                  className={clsx(
                    'font-mono font-bold text-sm shrink-0',
                    row.isClosed ? 'text-slate-500 line-through' : 'text-rose-600 dark:text-rose-400',
                  )}
                >
                  {formatINR(row.outstanding)}
                </span>
              </div>

              <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="truncate">
                  {row.subtitle} · {row.rate}% p.a.
                </span>
                <span className="shrink-0 font-mono">
                  {row.isGold ? 'Bullet' : row.emi !== null ? `EMI ${formatINR(row.emi)}` : ''}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <div
                  role="progressbar"
                  aria-label={`${row.name} repaid`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={row.paidPercent}
                  className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
                >
                  <div
                    className={clsx('h-full rounded-full', row.isGold ? 'bg-amber-500' : 'bg-emerald-500')}
                    style={{ width: `${row.paidPercent}%` }}
                  />
                </div>
                <span
                  className={clsx(
                    'text-[11px] font-semibold shrink-0',
                    row.remainingMonths <= 3 && !row.isClosed
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-500 dark:text-slate-400',
                  )}
                >
                  {row.isClosed ? 'Closed' : tenureLabel(row.remainingMonths, row.isGold)}
                </span>
              </div>

              {(row.projectNames.length > 0 || row.reconciled) && (
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                {row.projectNames.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                  >
                    <Tag className="w-3 h-3" /> {p}
                  </span>
                ))}
                {row.reconciled && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3" /> Reconciled
                  </span>
                )}
              </div>
              )}
            </div>

            <div className="flex flex-col items-center justify-between shrink-0 -my-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTagProject(row.id, row.name);
                }}
                aria-label={row.projectNames.length ? `Edit project funding for ${row.name}` : `Tag ${row.name} to a project`}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400"
              >
                <Tag className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => onDelete(e, row.id, row.name)}
                aria-label={`Delete ${row.name}`}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

          </div>
        </li>
      );
    })}
  </ul>
);
