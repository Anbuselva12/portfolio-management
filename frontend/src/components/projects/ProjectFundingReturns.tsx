import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Decimal from 'decimal.js';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertCircle, Check, Landmark, Loader2, Pencil, Tag, X } from 'lucide-react';
import { trackerApi } from '../../api/endpoints/tracker.api';
import { FundingReturns, TrackerProject } from '../../types';
import { formatINR, formatKpiINR } from '../../utils/currency';
import { ProjectTagModal, ProjectTagTarget } from './ProjectTagModal';

interface ProjectFundingReturnsProps {
  project: TrackerProject;
  /** Reloads the parent project (after the current value changes). */
  onProjectChanged: () => void;
}

// Fixed categorical order (dataviz palette): each loan keeps its colour; own funds and income are reserved.
const LOAN_COLORS = ['#2a78d6', '#eb6834', '#e87ba4', '#eda100', '#c98500', '#e34948'];
const OWN_FUNDS_COLOR = '#6250d6';
const INCOME_COLOR = '#1baf7a';
const EMI_COLOR = '#eb6834';
const AXIS_COLOR = '#94a3b8';
const GRID_COLOR = 'rgba(148, 163, 184, 0.25)';
const TOOLTIP_STYLE = { background: '#0f172a', border: 'none', borderRadius: 12, color: '#f1f5f9', fontSize: 12 };

const compactINR = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(value / 1e5).toFixed(1)} L`;
  if (abs >= 1e3) return `₹${(value / 1e3).toFixed(0)}k`;
  return `₹${value.toFixed(0)}`;
};

const monthLabel = (yearMonth: string): string => {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });
};

const pctText = (value: string | null): string => (value === null ? '—' : `${value}%`);

const Kpi: React.FC<{ label: string; value: string; hint?: string; tone?: 'neutral' | 'good' | 'bad' }> = ({
  label,
  value,
  hint,
  tone = 'neutral',
}) => (
  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-w-0">
    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
    <div
      className={`mt-1 text-lg sm:text-xl font-bold tabular-nums truncate ${
        tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'bad' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
      }`}
      title={value}
    >
      {value}
    </div>
    {hint && <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{hint}</div>}
  </div>
);

const ChartCard: React.FC<{ title: string; caption: string; children: React.ReactNode }> = ({ title, caption, children }) => (
  <section className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-w-0">
    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{caption}</p>
    {children}
  </section>
);

export const ProjectFundingReturns: React.FC<ProjectFundingReturnsProps> = ({ project, onProjectChanged }) => {
  const [data, setData] = useState<FundingReturns | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tagTarget, setTagTarget] = useState<ProjectTagTarget | null>(null);

  // Current market value editor
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [valueDraft, setValueDraft] = useState('');
  const [isSavingValue, setIsSavingValue] = useState(false);
  const [valueError, setValueError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await trackerApi.getFundingReturns(project.id));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load funding and returns');
    } finally {
      setIsLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    setIsLoading(true);
    load();
  }, [load]);

  const startEditValue = () => {
    setValueDraft(data?.currentValue ?? '');
    setValueError(null);
    setIsEditingValue(true);
  };

  const saveValue = async () => {
    const trimmed = valueDraft.trim();
    if (trimmed !== '' && (isNaN(Number(trimmed)) || Number(trimmed) < 0)) {
      setValueError('Enter a valid amount (0 or more), or clear the field to remove it');
      return;
    }
    setIsSavingValue(true);
    setValueError(null);
    try {
      await trackerApi.updateProject(project.id, { currentValue: trimmed === '' ? null : trimmed });
      setIsEditingValue(false);
      await load();
      onProjectChanged();
    } catch (err: any) {
      setValueError(err?.response?.data?.message || 'Failed to save current value');
    } finally {
      setIsSavingValue(false);
    }
  };

  const fundingSegments = useMemo(() => {
    if (!data) return [];
    const segments = data.loans.map((l, i) => ({
      key: `loan_${l.loanId}`,
      label: l.name,
      amount: Number(l.allocated),
      color: LOAN_COLORS[i % LOAN_COLORS.length],
    }));
    segments.push({ key: 'own', label: 'Own funds', amount: Number(data.ownFunds), color: OWN_FUNDS_COLOR });
    return segments.filter((s) => s.amount > 0);
  }, [data]);

  const cumulativeSeries = useMemo(() => {
    if (!data) return [];
    let running = new Decimal(0);
    return data.monthlySeries.map((m) => {
      running = running.plus(m.amount);
      return { month: monthLabel(m.month), received: running.toNumber() };
    });
  }, [data]);

  if (isLoading) {
    return (
      <div className="py-16 flex items-center justify-center text-slate-400 gap-2 text-sm" role="status">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading funding and returns…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div role="alert" className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" /> {error || 'No data'}
      </div>
    );
  }

  const invested = Number(data.invested);
  const monthlyIncome = Number(data.monthlyIncome);
  const emiShare = Number(data.loanTotals.emiShare);
  const netMonthly = Number(data.netMonthlyAfterEmi);
  const recoveredPct = invested > 0 ? (Number(data.totalIncomeReceived) / invested) * 100 : 0;
  const hasValue = data.currentValue !== null;

  const fundingRow: Record<string, number> = { name: 0 };
  fundingSegments.forEach((s) => (fundingRow[s.key] = s.amount));

  const coverRows = [
    { name: 'Monthly EMI', amount: emiShare, color: EMI_COLOR },
    { name: 'Monthly income', amount: monthlyIncome, color: INCOME_COLOR },
  ];

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label="Total invested" value={formatKpiINR(data.invested)} hint="Sum of project expenses" />
        <Kpi
          label="Funded by loans"
          value={formatKpiINR(data.fundedByLoans)}
          hint={data.fundedByLoansPct ? `${data.fundedByLoansPct}% of cost` : undefined}
        />
        <Kpi
          label="Own funds"
          value={formatKpiINR(data.ownFunds)}
          hint={data.ownFundsPct ? `${data.ownFundsPct}% · cash and income` : undefined}
        />
        <Kpi label="Income / month" value={formatKpiINR(data.monthlyIncome)} hint={`${data.incomes.length} tagged stream(s)`} tone={monthlyIncome > 0 ? 'good' : 'neutral'} />
        <Kpi
          label="Gross yield"
          value={pctText(data.grossYieldPct)}
          hint={data.paybackYears ? `Payback ≈ ${data.paybackYears} yrs on income alone` : 'Annual income ÷ invested'}
        />
        <Kpi
          label="Net after EMI"
          value={formatKpiINR(data.netMonthlyAfterEmi)}
          hint={emiShare > 0 ? `Income − ${formatKpiINR(data.loanTotals.emiShare)} EMI / mo` : 'No active loan EMI'}
          tone={emiShare > 0 ? (netMonthly >= 0 ? 'good' : 'bad') : 'neutral'}
        />
      </div>

      {/* Current value & total return */}
      <section className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Current market value</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Optional. Add it to include appreciation in the total return.
            </p>
          </div>
          {isEditingValue ? (
            <div className="flex items-center gap-2">
              <label htmlFor="project-current-value" className="sr-only">
                Current market value in rupees
              </label>
              <input
                id="project-current-value"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                autoFocus
                value={valueDraft}
                onChange={(e) => setValueDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveValue()}
                placeholder="e.g. 10000000"
                className="w-44 min-h-[44px] px-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button type="button" onClick={saveValue} disabled={isSavingValue} aria-label="Save current value" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-amber-600 hover:bg-amber-700 text-white cursor-pointer disabled:opacity-50">
                {isSavingValue ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button type="button" onClick={() => setIsEditingValue(false)} disabled={isSavingValue} aria-label="Cancel editing" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{hasValue ? formatINR(data.currentValue) : 'Not set'}</span>
              <button type="button" onClick={startEditValue} className="min-h-[44px] px-3 inline-flex items-center gap-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <Pencil className="w-4 h-4" /> {hasValue ? 'Edit' : 'Set value'}
              </button>
            </div>
          )}
        </div>
        {valueError && <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">{valueError}</p>}

        {hasValue && (
          <dl className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Appreciation</dt>
              <dd className={`font-bold tabular-nums ${Number(data.appreciation) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatINR(data.appreciation)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Income received</dt>
              <dd className="font-bold tabular-nums text-slate-900 dark:text-white">{formatINR(data.totalIncomeReceived)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Total return</dt>
              <dd className={`font-bold tabular-nums ${Number(data.totalReturn) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatINR(data.totalReturn)} ({pctText(data.totalReturnPct)})
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Yield on current value</dt>
              <dd className="font-bold tabular-nums text-slate-900 dark:text-white">{pctText(data.yieldOnCurrentValuePct)}</dd>
            </div>
          </dl>
        )}
      </section>

      {data.loansExceedInvested && (
        <div role="status" className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Loans tagged to this project exceed its recorded spend by {formatINR(data.loansExceedBy)}. Own funds are shown as ₹0.</span>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="How the project was funded" caption={`Share of ${formatINR(data.invested)} total cost`}>
          {fundingSegments.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Add expenses to this project to see how it was funded.</p>
          ) : (
            <>
              <div className="h-24 text-white dark:text-slate-900" role="img" aria-label={`Funding mix: ${fundingSegments.map((s) => `${s.label} ${formatINR(s.amount)}`).join(', ')}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={[fundingRow]} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                    <XAxis type="number" hide domain={[0, 'dataMax']} />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip
                      cursor={false}
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value, name) => [formatINR(Number(value)), String(name)]}
                    />
                    {fundingSegments.map((s) => (
                      <Bar key={s.key} dataKey={s.key} name={s.label} stackId="funding" fill={s.color} stroke="currentColor" strokeWidth={2} barSize={36} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                {fundingSegments.map((s) => (
                  <li key={s.key} className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
                    {s.label} {compactINR(s.amount)}
                    {invested > 0 && <span className="text-slate-400"> · {((s.amount / invested) * 100).toFixed(0)}%</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </ChartCard>

        <ChartCard title="Income received per month" caption="Confirmed receipts and one-off income tagged to this project">
          {data.monthlySeries.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-6">
              No income yet. Tag an income stream (for example rent) to this project to track it here.
            </p>
          ) : (
            <div className="h-48" role="img" aria-label={`Monthly income, ${data.monthlySeries.length} month(s), total ${formatINR(data.totalIncomeReceived)}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlySeries.map((m) => ({ month: monthLabel(m.month), amount: Number(m.amount) }))} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                  <XAxis dataKey="month" tick={{ fill: AXIS_COLOR, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID_COLOR }} />
                  <YAxis tickFormatter={compactINR} tick={{ fill: AXIS_COLOR, fontSize: 11 }} tickLine={false} axisLine={false} width={56} />
                  <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} contentStyle={TOOLTIP_STYLE} formatter={(value) => [formatINR(Number(value)), 'Received']} />
                  <Bar dataKey="amount" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Payback progress"
          caption={`${recoveredPct.toFixed(1)}% of ${formatKpiINR(data.invested)} recovered through income so far`}
        >
          {cumulativeSeries.length === 0 || invested <= 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Shows up once income is tagged and expenses are recorded.</p>
          ) : (
            <div className="h-48" role="img" aria-label={`Cumulative income received ${formatINR(data.totalIncomeReceived)} against ${formatINR(data.invested)} invested`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeSeries} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                  <XAxis dataKey="month" tick={{ fill: AXIS_COLOR, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID_COLOR }} />
                  <YAxis domain={[0, Math.max(invested, 1)]} tickFormatter={compactINR} tick={{ fill: AXIS_COLOR, fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [formatINR(Number(value)), 'Cumulative income']} />
                  <ReferenceLine y={invested} stroke={AXIS_COLOR} strokeDasharray="4 4" label={{ value: 'Invested', fill: AXIS_COLOR, fontSize: 11, position: 'insideTopRight' }} />
                  <Line type="monotone" dataKey="received" stroke={INCOME_COLOR} strokeWidth={2} dot={{ r: 3, fill: INCOME_COLOR, stroke: 'transparent' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Income vs. loan EMIs, monthly"
          caption={
            emiShare > 0
              ? `Income covers ${pctText(data.incomeCoversEmiPct)} of the EMIs on loans tagged to this project`
              : 'No active loan EMI is tagged to this project'
          }
        >
          {monthlyIncome <= 0 && emiShare <= 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Tag income streams and loans to compare them here.</p>
          ) : (
            <div className="h-40" role="img" aria-label={`Monthly income ${formatINR(monthlyIncome)} against monthly EMI ${formatINR(emiShare)}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={coverRows} margin={{ top: 4, right: 72, bottom: 4, left: 8 }}>
                  <XAxis type="number" hide domain={[0, 'dataMax']} />
                  <YAxis type="category" dataKey="name" width={104} tick={{ fill: AXIS_COLOR, fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={false} contentStyle={TOOLTIP_STYLE} formatter={(value) => [formatINR(Number(value)), '']} />
                  <Bar
                    dataKey="amount"
                    barSize={26}
                    radius={[0, 4, 4, 0]}
                    label={{ position: 'right', fill: AXIS_COLOR, fontSize: 12, formatter: (v: unknown) => compactINR(Number(v)) }}
                    shape={(props: any) => <rect x={props.x} y={props.y} width={Math.max(props.width, 0)} height={props.height} rx={4} fill={props.payload.color} />}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Linked loans */}
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Landmark className="w-4 h-4 text-amber-600" /> Linked loans
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Loans tagged to this project. Figures are this project's share of each loan. Tag a loan from Loans or Transactions.
          </p>
        </div>
        {data.loans.length === 0 ? (
          <p className="p-5 text-sm text-slate-500 dark:text-slate-400">No loans tagged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="stack-mobile w-full text-left text-sm min-w-[720px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Loan</th>
                  <th className="py-3 px-5 text-right">Amount used</th>
                  <th className="py-3 px-5 text-right">Outstanding</th>
                  <th className="py-3 px-5 text-right">EMI / mo</th>
                  <th className="py-3 px-5 text-right">Interest paid</th>
                  <th className="py-3 px-5 text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                {data.loans.map((l) => (
                  <tr key={l.loanId}>
                    <td className="py-3 px-5">
                      <div className="font-semibold text-slate-900 dark:text-white">{l.name}</div>
                      <div className="text-xs text-slate-400">
                        {l.lender} · {l.sharePct}% of loan{l.status !== 'active' ? ` · ${l.status}` : ''}
                      </div>
                    </td>
                    <td data-label="Amount used" className="py-3 px-5 text-right">{formatINR(l.allocated)}</td>
                    <td data-label="Outstanding" className="py-3 px-5 text-right">{formatINR(l.outstandingShare)}</td>
                    <td data-label="EMI / mo" className="py-3 px-5 text-right">{formatINR(l.emiShare)}</td>
                    <td data-label="Interest paid" className="py-3 px-5 text-right">{formatINR(l.interestPaidShare)}</td>
                    <td data-actions className="py-3 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => setTagTarget({ kind: 'loan', id: l.loanId, label: `${l.name} · ${l.lender}` })}
                        className="min-h-[44px] px-3 inline-flex items-center gap-1.5 text-xs font-semibold rounded-xl text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer"
                      >
                        <Tag className="w-3.5 h-3.5" /> Edit allocation
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/40 tabular-nums">
                  <td className="py-3 px-5">Total</td>
                  <td data-label="Amount used" className="py-3 px-5 text-right">{formatINR(data.loanTotals.allocated)}</td>
                  <td data-label="Outstanding" className="py-3 px-5 text-right">{formatINR(data.loanTotals.outstandingShare)}</td>
                  <td data-label="EMI / mo" className="py-3 px-5 text-right">{formatINR(data.loanTotals.emiShare)}</td>
                  <td data-label="Interest paid" className="py-3 px-5 text-right">{formatINR(data.loanTotals.interestPaidShare)}</td>
                  <td className="hidden md:table-cell" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Linked income */}
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Linked income</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Income streams tagged to this project, including earlier rent revisions. Tag a stream from Income or Transactions.
          </p>
        </div>
        {data.incomes.length === 0 ? (
          <p className="p-5 text-sm text-slate-500 dark:text-slate-400">No income tagged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="stack-mobile w-full text-left text-sm min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Stream</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Per month</th>
                  <th className="py-3 px-5 text-right">Received so far</th>
                  <th className="py-3 px-5 text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                {data.incomes.map((i) => (
                  <tr key={i.id}>
                    <td className="py-3 px-5">
                      <div className="font-semibold text-slate-900 dark:text-white">{i.label}</div>
                      <div className="text-xs text-slate-400 capitalize">{i.recurrence === 'one_off' ? 'One-off' : 'Recurring'} · {i.type}</div>
                    </td>
                    <td data-label="Status" className="py-3 px-5 capitalize text-slate-600 dark:text-slate-300">{i.status}</td>
                    <td data-label="Per month" className="py-3 px-5 text-right">{i.recurrence === 'one_off' ? '—' : formatINR(i.monthlyAmount)}</td>
                    <td data-label="Received" className="py-3 px-5 text-right">{formatINR(i.receivedTotal)}</td>
                    <td data-actions className="py-3 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => setTagTarget({ kind: 'income', id: i.id, label: i.label, currentProjectId: project.id })}
                        className="min-h-[44px] px-3 inline-flex items-center gap-1.5 text-xs font-semibold rounded-xl text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer"
                      >
                        <Tag className="w-3.5 h-3.5" /> Change project
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Accessible table alternative for the charts */}
      <details className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-sm">
        <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200 min-h-[44px] flex items-center">View chart data as a table</summary>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          <table className="w-full text-left text-xs">
            <caption className="text-left font-semibold mb-1 text-slate-700 dark:text-slate-200">Funding</caption>
            <tbody className="tabular-nums">
              {fundingSegments.map((s) => (
                <tr key={s.key} className="border-t border-slate-100 dark:border-slate-800">
                  <th scope="row" className="py-1.5 font-medium text-slate-600 dark:text-slate-300">{s.label}</th>
                  <td className="py-1.5 text-right">{formatINR(s.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="w-full text-left text-xs">
            <caption className="text-left font-semibold mb-1 text-slate-700 dark:text-slate-200">Income by month</caption>
            <tbody className="tabular-nums">
              {data.monthlySeries.length === 0 ? (
                <tr><td className="py-1.5 text-slate-400">No income yet</td></tr>
              ) : (
                data.monthlySeries.map((m) => (
                  <tr key={m.month} className="border-t border-slate-100 dark:border-slate-800">
                    <th scope="row" className="py-1.5 font-medium text-slate-600 dark:text-slate-300">{monthLabel(m.month)}</th>
                    <td className="py-1.5 text-right">{formatINR(m.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </details>

      {tagTarget && (
        <ProjectTagModal
          target={tagTarget}
          onClose={() => setTagTarget(null)}
          onSaved={() => {
            load();
            onProjectChanged();
          }}
        />
      )}
    </div>
  );
};
