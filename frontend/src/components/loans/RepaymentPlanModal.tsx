import React, { useEffect, useId, useRef, useState } from 'react';
import { X, Loader2, AlertCircle, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { loansApi } from '../../api/endpoints/loans.api';
import { dashboardApi } from '../../api/endpoints/dashboard.api';
import { RepaymentPlanChange } from '../../types';
import { formatINR } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { Affordability, assessAffordability, formatMonths } from '../../utils/repaymentPlan';

type PlanMode = 'set_emi' | 'set_tenure';

const MAX_TENURE_MONTHS = 600;
const EMI_STEP_PERCENTS = [-10, 10, 25] as const;
const TENURE_STEP_YEARS = [-1, 1, 2] as const;
const PREVIEW_DEBOUNCE_MS = 350;

interface RepaymentPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: string;
  currentEmi: string | number;
  remainingMonths: number;
  onSuccess: () => void;
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white tabular-nums text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500';
const labelClass = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1';
const chipClass =
  'px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer tabular-nums';

export const RepaymentPlanModal: React.FC<RepaymentPlanModalProps> = ({
  isOpen,
  onClose,
  loanId,
  currentEmi,
  remainingMonths,
  onSuccess,
}) => {
  const titleId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<PlanMode>('set_emi');
  const [emi, setEmi] = useState('');
  const [years, setYears] = useState('0');
  const [months, setMonths] = useState('0');

  const [preview, setPreview] = useState<RepaymentPlanChange | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [surplus, setSurplus] = useState<number | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const emiValue = Number(emi);
  const tenureMonths = Math.floor(Number(years) || 0) * 12 + Math.floor(Number(months) || 0);
  const currentEmiValue = Number(currentEmi);

  // Reset to the loan's current plan every time the dialog opens.
  useEffect(() => {
    if (!isOpen) return;
    setMode('set_emi');
    setEmi(String(currentEmiValue));
    setYears(String(Math.floor(remainingMonths / 12)));
    setMonths(String(remainingMonths % 12));
    setPreview(null);
    setPreviewError(null);
    setApplyError(null);
    setSurplus(null);
    dashboardApi
      .getSummary()
      .then((summary) => setSurplus(Number(summary?.monthlySavings ?? 0)))
      .catch(() => setSurplus(null));
  }, [isOpen, currentEmiValue, remainingMonths]);

  useEffect(() => {
    if (!isOpen) return;
    firstFieldRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, mode, onClose]);

  const payload =
    mode === 'set_emi'
      ? emiValue > 0
        ? { mode, newEmi: String(emiValue) }
        : null
      : tenureMonths >= 1 && tenureMonths <= MAX_TENURE_MONTHS
        ? { mode, newTenureMonths: tenureMonths }
        : null;
  const payloadKey = payload ? JSON.stringify(payload) : '';

  useEffect(() => {
    if (!isOpen) return;
    if (!payload) {
      setPreview(null);
      setPreviewError(
        mode === 'set_emi'
          ? 'Enter an EMI above zero.'
          : `Enter a tenure between 1 month and ${MAX_TENURE_MONTHS / 12} years.`,
      );
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsPreviewLoading(true);
      setPreviewError(null);
      try {
        const result = await loansApi.previewRepaymentPlan(loanId, payload);
        if (!cancelled) setPreview(result);
      } catch (err: any) {
        if (cancelled) return;
        setPreview(null);
        setPreviewError(err.response?.data?.message || 'Could not work out this plan. Try different numbers.');
      } finally {
        if (!cancelled) setIsPreviewLoading(false);
      }
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // payloadKey stands in for payload, which is rebuilt on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, loanId, payloadKey, mode]);

  if (!isOpen) return null;

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payload || !preview) return;
    setIsApplying(true);
    setApplyError(null);
    try {
      await loansApi.applyRepaymentPlan(loanId, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setApplyError(err.response?.data?.message || 'Could not apply this plan. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  const bumpEmi = (percent: number) => setEmi(String(Math.max(1, Math.round(currentEmiValue * (1 + percent / 100)))));
  const bumpTenure = (deltaYears: number) => {
    const total = Math.min(MAX_TENURE_MONTHS, Math.max(1, remainingMonths + deltaYears * 12));
    setYears(String(Math.floor(total / 12)));
    setMonths(String(total % 12));
  };

  const interestSaved = preview ? Number(preview.interestSaved) : 0;
  const emiDiff = preview ? Number(preview.emiDiff) : 0;
  const affordability = preview ? assessAffordability(emiDiff, surplus) : null;
  const lastInstallment = preview ? Number(preview.lastInstallmentAmount) : 0;
  const isUnchanged = preview !== null && emiDiff === 0 && preview.tenureDiffMonths === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white">
              Change EMI or tenure
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Move the EMI and the tenure follows, or choose a tenure and the EMI follows. Paid installments stay as they are.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleApply} className="p-6 overflow-y-auto space-y-5">
          {applyError && (
            <div role="alert" className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{applyError}</span>
            </div>
          )}

          <div role="group" aria-label="What to change" className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold w-full">
            {([
              ['set_emi', 'Change EMI'],
              ['set_tenure', 'Change tenure'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={`flex-1 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  mode === value
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'set_emi' ? (
            <div>
              <label htmlFor="plan-emi" className={labelClass}>
                New monthly EMI (₹) <span className="font-normal text-slate-500">— now {formatINR(currentEmiValue)}</span>
              </label>
              <input
                id="plan-emi"
                ref={firstFieldRef}
                type="number"
                inputMode="decimal"
                min="1"
                step="1"
                value={emi}
                onChange={(e) => setEmi(e.target.value)}
                className={inputClass}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {EMI_STEP_PERCENTS.map((p) => (
                  <button key={p} type="button" onClick={() => bumpEmi(p)} className={chipClass}>
                    {p > 0 ? `+${p}%` : `${p}%`}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className={labelClass}>
                New time left <span className="font-normal text-slate-500">— now {formatMonths(remainingMonths)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="plan-years" className="sr-only">
                    Years
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="plan-years"
                      ref={firstFieldRef}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max={MAX_TENURE_MONTHS / 12}
                      step="1"
                      value={years}
                      onChange={(e) => setYears(e.target.value)}
                      className={inputClass}
                    />
                    <span className="text-xs text-slate-500">years</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="plan-months" className="sr-only">
                    Months
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="plan-months"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="11"
                      step="1"
                      value={months}
                      onChange={(e) => setMonths(e.target.value)}
                      className={inputClass}
                    />
                    <span className="text-xs text-slate-500">months</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {TENURE_STEP_YEARS.map((y) => (
                  <button key={y} type="button" onClick={() => bumpTenure(y)} className={chipClass}>
                    {y > 0 ? `+${y} yr${y === 1 ? '' : 's'}` : `${y} yr`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div aria-live="polite">
            {isPreviewLoading ? (
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>Working out the new schedule…</span>
              </div>
            ) : previewError ? (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
                {previewError}
              </div>
            ) : preview ? (
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4 text-sm">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <dt className="text-xs text-slate-500">Monthly EMI</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white tabular-nums flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-500 font-normal">{formatINR(Number(preview.oldEmi))}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" aria-label="becomes" />
                      <span>{formatINR(Number(preview.newEmi))}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Time left</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white tabular-nums flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-500 font-normal">{formatMonths(preview.oldTenureMonths)}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" aria-label="becomes" />
                      <span>{formatMonths(preview.newTenureMonths)}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Debt-free by</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white tabular-nums">
                      {formatDate(preview.newPayoffDate)}
                      <span className="block text-xs font-normal text-slate-500">was {formatDate(preview.previousPayoffDate)}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Interest from here</dt>
                    <dd
                      className={`font-semibold tabular-nums ${
                        interestSaved > 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : interestSaved < 0
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {interestSaved > 0
                        ? `Saves ${formatINR(interestSaved)}`
                        : interestSaved < 0
                          ? `${formatINR(Math.abs(interestSaved))} more`
                          : 'No change'}
                    </dd>
                  </div>
                </dl>

                {Math.abs(lastInstallment - Number(preview.newEmi)) >= 1 && (
                  <p className="text-xs text-slate-500">
                    The last installment is {formatINR(lastInstallment)} so the balance closes at exactly zero.
                  </p>
                )}

                {affordability && <AffordabilityNote result={affordability} />}
              </div>
            ) : null}
          </div>

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
              disabled={!preview || isUnchanged || isPreviewLoading || isApplying}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
            >
              {isApplying && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Apply new plan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AffordabilityNote: React.FC<{ result: Affordability }> = ({ result }) => {
  const base = 'flex items-start gap-2 text-xs rounded-xl p-3';
  switch (result.kind) {
    case 'lower':
      return (
        <p className={`${base} bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Frees up {formatINR(result.monthlyRelief)} a month. Paying less each month means a longer loan or more interest overall.</span>
        </p>
      );
    case 'same':
      return <p className={`${base} bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300`}>Same monthly payment as today.</p>;
    case 'fits':
      return (
        <p className={`${base} bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            Feasible: it fits within this month's surplus of {formatINR(result.surplus)}, leaving {formatINR(result.leftOver)} spare.
          </span>
        </p>
      );
    case 'short':
      return (
        <p className={`${base} bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300`}>
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            Tight: this month's surplus is {formatINR(result.surplus)}, which is {formatINR(result.shortBy)} less than the extra EMI needs. Check that income covers it.
          </span>
        </p>
      );
    case 'unknown':
      return (
        <p className={`${base} bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300`}>
          This needs {formatINR(result.extra)} more each month. Your surplus could not be loaded to check it.
        </p>
      );
  }
};
