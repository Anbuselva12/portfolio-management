import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Decimal from 'decimal.js';
import { AlertCircle, Loader2, Plus, Tag, Trash2, X } from 'lucide-react';
import { trackerApi } from '../../api/endpoints/tracker.api';
import { incomeApi } from '../../api/endpoints/income.api';
import { TrackerProject } from '../../types';
import { formatINR } from '../../utils/currency';
import { Portal } from '../ui/Portal';

export type ProjectTagTarget =
  | { kind: 'income'; id: string; label: string; currentProjectId: string | null }
  | { kind: 'loan'; id: string; label: string };

interface ProjectTagModalProps {
  target: ProjectTagTarget;
  onClose: () => void;
  /** Called after a successful save so the caller can refresh its data. */
  onSaved: () => void;
}

interface AllocationRow {
  key: number;
  projectId: string;
  amount: string;
}

const inputClass =
  'w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500';

/**
 * Tags the *source* of money to a project (SDD §4.11): an income stream gets one project,
 * a loan can be split across several projects with an amount each.
 */
export const ProjectTagModal: React.FC<ProjectTagModalProps> = ({ target, onClose, onSaved }) => {
  const [projects, setProjects] = useState<TrackerProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [incomeProjectId, setIncomeProjectId] = useState(
    target.kind === 'income' ? target.currentProjectId ?? '' : '',
  );
  const [loanPrincipal, setLoanPrincipal] = useState<Decimal>(new Decimal(0));
  const [rows, setRows] = useState<AllocationRow[]>([]);
  const nextKey = useRef(1);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const projectList = await trackerApi.getProjects();
        if (cancelled) return;
        setProjects(projectList);
        if (target.kind === 'loan') {
          const res = await trackerApi.getLoanAllocations(target.id);
          if (cancelled) return;
          setLoanPrincipal(new Decimal(res.loanPrincipal));
          setRows(res.allocations.map((a) => ({ key: nextKey.current++, projectId: a.projectId, amount: a.amount })));
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.message || 'Failed to load project data');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [target.kind, target.id]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    dialogRef.current?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSaving, onClose]);

  const allocated = useMemo(
    () => rows.reduce((sum, r) => sum.plus(r.amount && !isNaN(Number(r.amount)) ? new Decimal(r.amount) : 0), new Decimal(0)),
    [rows],
  );
  const remaining = loanPrincipal.minus(allocated);
  const usedProjectIds = new Set(rows.map((r) => r.projectId));
  const canAddRow = projects.some((p) => !usedProjectIds.has(p.id));

  const addRow = () => {
    const free = projects.find((p) => !usedProjectIds.has(p.id));
    if (!free) return;
    setRows((prev) => [
      ...prev,
      { key: nextKey.current++, projectId: free.id, amount: remaining.gt(0) ? remaining.toFixed(2) : '' },
    ]);
  };

  const updateRow = (key: number, patch: Partial<AllocationRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const validateLoan = (): string | null => {
    for (const r of rows) {
      if (!r.projectId) return 'Choose a project for every row';
      if (!r.amount || isNaN(Number(r.amount)) || new Decimal(r.amount).lte(0)) {
        return 'Enter an amount greater than zero for every project';
      }
    }
    if (allocated.gt(loanPrincipal)) {
      return `Allocated total (${formatINR(allocated.toFixed(2))}) is more than the loan principal (${formatINR(loanPrincipal.toFixed(2))})`;
    }
    return null;
  };

  const handleSave = async () => {
    setError(null);
    if (target.kind === 'loan') {
      const problem = validateLoan();
      if (problem) {
        setError(problem);
        return;
      }
    }
    setIsSaving(true);
    try {
      if (target.kind === 'income') {
        await incomeApi.update(target.id, { projectId: incomeProjectId || null });
      } else {
        await trackerApi.setLoanAllocations(
          target.id,
          rows.map((r) => ({ projectId: r.projectId, amount: new Decimal(r.amount).toFixed(2) })),
        );
      }
      onSaved();
      onClose();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || 'Failed to save project tag');
    } finally {
      setIsSaving(false);
    }
  };

  const noProjects = !isLoading && projects.length === 0;

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
        aria-labelledby="project-tag-title"
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 my-auto max-h-[92dvh] overflow-y-auto space-y-5 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="project-tag-title" className="text-lg font-bold text-slate-900 dark:text-white">
                {target.kind === 'loan' ? 'Project funding' : 'Tag to project'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 break-words">{target.label}</p>
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
          {target.kind === 'loan'
            ? 'This tags the whole loan: every installment and part-payment follows. Enter how much of the loan was used for each project.'
            : 'This tags the whole income stream: every past and future receipt follows. Choose “No project” to remove the tag.'}
        </p>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-sm text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-8 flex items-center justify-center text-slate-400 gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading projects…
          </div>
        ) : noProjects ? (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-600 dark:text-slate-300">
            You have no projects yet.{' '}
            <Link to="/expenses/projects" className="font-semibold text-amber-600 dark:text-amber-400 underline">
              Create a project
            </Link>{' '}
            first, then come back to tag this.
          </div>
        ) : target.kind === 'income' ? (
          <div>
            <label htmlFor="tag-income-project" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Project
            </label>
            <select
              id="tag-income-project"
              value={incomeProjectId}
              onChange={(e) => setIncomeProjectId(e.target.value)}
              className={inputClass}
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">Not tagged to any project yet.</p>
            )}
            {rows.map((row, index) => (
              <div key={row.key} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_10rem_auto] gap-2 items-end">
                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor={`alloc-project-${row.key}`} className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Project {index + 1}
                  </label>
                  <select
                    id={`alloc-project-${row.key}`}
                    value={row.projectId}
                    onChange={(e) => updateRow(row.key, { projectId: e.target.value })}
                    className={inputClass}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} disabled={usedProjectIds.has(p.id) && p.id !== row.projectId}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`alloc-amount-${row.key}`} className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Amount used (₹)
                  </label>
                  <input
                    id={`alloc-amount-${row.key}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={row.amount}
                    onChange={(e) => updateRow(row.key, { amount: e.target.value })}
                    className={`${inputClass} font-mono`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                  aria-label={`Remove project ${index + 1}`}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addRow}
              disabled={!canAddRow}
              className="min-h-[44px] inline-flex items-center gap-2 px-3 text-sm font-semibold text-amber-700 dark:text-amber-400 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> Add project
            </button>

            <dl className="grid grid-cols-3 gap-2 text-center text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Loan principal</dt>
                <dd className="font-bold text-slate-900 dark:text-white tabular-nums">{formatINR(loanPrincipal.toFixed(2))}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Allocated</dt>
                <dd className="font-bold text-slate-900 dark:text-white tabular-nums">{formatINR(allocated.toFixed(2))}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Remaining</dt>
                <dd className={`font-bold tabular-nums ${remaining.isNegative() ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                  {formatINR(remaining.toFixed(2))}
                </dd>
              </div>
            </dl>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="min-h-[44px] px-4 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading || noProjects}
            className="min-h-[44px] px-5 rounded-xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
};
