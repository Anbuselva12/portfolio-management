import React, { useEffect, useState, useMemo } from 'react';
import {
  transactionsApi,
  TransactionItem,
  TransactionsResponse,
} from '../../api/endpoints/transactions.api';
import { formatCurrency } from '../../utils/currency';
import { trackerApi } from '../../api/endpoints/tracker.api';
import { TrackerProject } from '../../types';
import { ProjectTagModal, ProjectTagTarget } from '../../components/projects/ProjectTagModal';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Search,
  RefreshCw,
  Wallet,
  Receipt,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
  Tag,
  Pencil,
  Trash2,
} from 'lucide-react';
import clsx from 'clsx';
import {
  TransactionActionModal,
  TransactionActionMode,
  getTransactionCapabilities,
} from '../../components/transactions/TransactionActionModal';

export const TransactionsPage: React.FC = () => {
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [duration, setDuration] = useState<'1m' | 'quarterly' | 'yearly' | 'all'>('1m');
  const [flow, setFlow] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [source, setSource] = useState<'all' | 'income' | 'expense' | 'loan'>('all');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [projects, setProjects] = useState<TrackerProject[]>([]);
  const [tagTarget, setTagTarget] = useState<ProjectTagTarget | null>(null);
  const [actionTarget, setActionTarget] = useState<{ tx: TransactionItem; mode: TransactionActionMode } | null>(null);

  const fetchTransactions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await transactionsApi.getTransactions({
        duration,
        flow,
        source,
        projectId: projectFilter === 'all' ? undefined : projectFilter,
        search: search.trim() || undefined,
        page,
        limit: 50,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load transaction statement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [duration, flow, source, projectFilter, page]);

  useEffect(() => {
    // Projects feed the filter only; the statement still works without them.
    trackerApi.getProjects().then((list) => setProjects(list || [])).catch(() => setProjects([]));
  }, []);

  // Handle search with debounce/submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const baseCurrency = data?.summary?.baseCurrency || 'INR';

  const getTypeBadge = (type: TransactionItem['type']) => {
    switch (type) {
      case 'income_one_off':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            One-Off Income
          </span>
        );
      case 'income_recurring':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
            Recurring Income
          </span>
        );
      case 'expense_household':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            Household Expense
          </span>
        );
      case 'expense_insurance':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
            Insurance Premium
          </span>
        );
      case 'loan_emi':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
            Loan EMI Paid
          </span>
        );
      case 'loan_prepayment':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
            Part Payment
          </span>
        );
      case 'gold_loan_payment':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            Gold Loan Payment
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            {type}
          </span>
        );
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const netCashFlowNum = Number(data?.summary?.netCashFlow || '0');

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Statement of Transactions
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300">
              Live Feed
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Unified chronological passbook of all incomes, household expenses, and loan debt servicing.
          </p>
        </div>

        <button
          onClick={fetchTransactions}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Inflow */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-850 border border-emerald-100 dark:border-emerald-950/50 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Total Inflow (+)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 whitespace-nowrap">
            +{formatCurrency(data?.summary?.totalInflow || '0', baseCurrency)}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            One-offs & confirmed receipts
          </p>
        </div>

        {/* Total Outflow / Debt */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-850 border border-rose-100 dark:border-rose-950/50 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Total Outflow / Debt (-)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-2 whitespace-nowrap">
            -{formatCurrency(data?.summary?.totalOutflow || '0', baseCurrency)}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Expenses, EMIs & prepayments
          </p>
        </div>

        {/* Net Cash Flow */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Net Cash Flow
            </span>
            <div
              className={clsx(
                'w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold',
                netCashFlowNum >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
              )}
            >
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div
            className={clsx(
              'text-lg sm:text-2xl font-black mt-2 whitespace-nowrap',
              netCashFlowNum >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            )}
          >
            {netCashFlowNum >= 0 ? '+' : ''}
            {formatCurrency(data?.summary?.netCashFlow || '0', baseCurrency)}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={clsx(
                'inline-block px-1.5 py-0.2 rounded text-[11px] font-bold uppercase',
                netCashFlowNum >= 0
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
              )}
            >
              {netCashFlowNum >= 0 ? 'Surplus' : 'Deficit'}
            </span>
            <span className="text-xs text-gray-400">in selected period</span>
          </div>
        </div>

        {/* Total Activity */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Recorded Transactions
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white mt-2">
            {data?.summary?.transactionCount || 0}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Matching current filters
          </p>
        </div>
      </div>

      {/* Control Bar: Filters, Flow Toggles, Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-800 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Duration Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-semibold max-w-full overflow-x-auto whitespace-nowrap self-start lg:self-auto">
            <button
              onClick={() => {
                setDuration('1m');
                setPage(1);
              }}
              className={clsx(
                'px-3 py-1.5 rounded-lg transition-all cursor-pointer',
                duration === '1m'
                  ? 'bg-white dark:bg-gray-700 text-cyan-600 dark:text-cyan-300 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              )}
            >
              1 Month
            </button>
            <button
              onClick={() => {
                setDuration('quarterly');
                setPage(1);
              }}
              className={clsx(
                'px-3 py-1.5 rounded-lg transition-all cursor-pointer',
                duration === 'quarterly'
                  ? 'bg-white dark:bg-gray-700 text-cyan-600 dark:text-cyan-300 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              )}
            >
              Quarterly
            </button>
            <button
              onClick={() => {
                setDuration('yearly');
                setPage(1);
              }}
              className={clsx(
                'px-3 py-1.5 rounded-lg transition-all cursor-pointer',
                duration === 'yearly'
                  ? 'bg-white dark:bg-gray-700 text-cyan-600 dark:text-cyan-300 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              )}
            >
              Yearly
            </button>
            <button
              onClick={() => {
                setDuration('all');
                setPage(1);
              }}
              className={clsx(
                'px-3 py-1.5 rounded-lg transition-all cursor-pointer',
                duration === 'all'
                  ? 'bg-white dark:bg-gray-700 text-cyan-600 dark:text-cyan-300 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              )}
            >
              All Time
            </button>
          </div>

          {/* Flow Direction Selector (All / Inflow + / Debt -) */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-semibold max-w-full overflow-x-auto whitespace-nowrap self-start lg:self-auto">
            <button
              onClick={() => {
                setFlow('all');
                setPage(1);
              }}
              className={clsx(
                'px-3 py-1.5 rounded-lg transition-all cursor-pointer',
                flow === 'all'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              )}
            >
              All Flows
            </button>
            <button
              onClick={() => {
                setFlow('inflow');
                setPage(1);
              }}
              className={clsx(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer',
                flow === 'inflow'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              )}
            >
              <span>Inflow (+)</span>
            </button>
            <button
              onClick={() => {
                setFlow('outflow');
                setPage(1);
              }}
              className={clsx(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer',
                flow === 'outflow'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              )}
            >
              <span>Debt / Outflow (-)</span>
            </button>
          </div>
        </div>

        {/* Secondary Filter: Source & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Source:</span>
            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value as any);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="all">All Sources</option>
              <option value="income">Income Only</option>
              <option value="expense">Expenses Only</option>
              <option value="loan">Loans & Debt Only</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="tx-project-filter" className="text-xs font-medium text-gray-500 dark:text-gray-400">Project:</label>
            <select
              id="tx-project-filter"
              value={projectFilter}
              onChange={(e) => {
                setProjectFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="all">All Projects</option>
              <option value="untagged">Untagged</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search statement..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </form>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Transactions Feed / Table */}
      <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="stack-mobile w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th scope="col" className="px-5 py-3.5 font-bold">
                  Date
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold">
                  Transaction & Details
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold">
                  Type / Category
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold">
                  Project
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold">
                  Member
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold text-right">
                  Amount
                </th>
                <th scope="col" className="px-5 py-3.5 font-bold text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-cyan-600" />
                      <span>Loading statement entries...</span>
                    </div>
                  </td>
                </tr>
              ) : !data?.transactions || data.transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
                      <Receipt className="w-10 h-10 stroke-1 text-gray-300 dark:text-gray-600" />
                      <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                        No transactions found
                      </p>
                      <p className="text-xs max-w-sm text-gray-400">
                        No income arrivals, expenses, or loan repayments recorded matching your selected period and filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.transactions.map((tx) => {
                  const isInflow = tx.direction === 'inflow';
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      {/* Date */}
                      <td data-label="Date" className="px-5 py-4 whitespace-nowrap text-xs font-medium text-gray-600 dark:text-gray-300">
                        {formatDate(tx.date)}
                      </td>

                      {/* Transaction & Details */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {tx.title}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {tx.subtitle}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td data-label="Type" className="px-5 py-4 whitespace-nowrap">
                        {getTypeBadge(tx.type)}
                      </td>

                      {/* Project tag (edits the source income stream / loan) */}
                      <td data-label="Project" className="px-5 py-4">
                        {tx.tagTarget ? (
                          <button
                            type="button"
                            onClick={() =>
                              setTagTarget(
                                tx.tagTarget!.kind === 'income'
                                  ? { kind: 'income', id: tx.tagTarget!.id, label: tx.title, currentProjectId: tx.projects[0]?.id ?? null }
                                  : { kind: 'loan', id: tx.tagTarget!.id, label: tx.title },
                              )
                            }
                            aria-label={tx.projects.length ? `Edit project tag for ${tx.title}` : `Tag ${tx.title} to a project`}
                            className={clsx(
                              'min-h-[32px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold cursor-pointer text-left',
                              tx.projects.length
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                                : 'border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-amber-700 dark:hover:text-amber-400 hover:border-amber-400',
                            )}
                          >
                            <Tag className="w-3 h-3 shrink-0" />
                            {tx.projects.length ? tx.projects.map((p) => p.name).join(', ') : 'Tag project'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>

                      {/* Member */}
                      <td data-label="Member" className="px-5 py-4 whitespace-nowrap text-xs">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {tx.memberName}
                        </span>
                      </td>

                      {/* Directional Amount */}
                      <td data-label="Amount" className="px-5 py-4 whitespace-nowrap text-right">
                        <div
                          className={clsx(
                            'text-sm font-extrabold tracking-tight',
                            isInflow
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          )}
                        >
                          {isInflow ? '+' : '-'}
                          {formatCurrency(tx.convertedAmount, baseCurrency)}
                        </div>
                        {tx.currency !== baseCurrency && (
                          <div className="text-[11px] text-gray-400">
                            Orig: {formatCurrency(tx.amount, tx.currency)}
                          </div>
                        )}
                      </td>

                      {/* Edit / delete the source record */}
                      <td data-actions className="px-3 py-4 whitespace-nowrap text-right">
                        {(() => {
                          const caps = getTransactionCapabilities(tx);
                          if (!caps.canEdit && !caps.canDelete) {
                            return <span className="text-[11px] text-gray-400">{caps.lockedReason}</span>;
                          }
                          return (
                            <div className="inline-flex items-center gap-1">
                              {caps.canEdit && (
                                <button
                                  type="button"
                                  onClick={() => setActionTarget({ tx, mode: 'edit' })}
                                  aria-label={`Edit transaction ${tx.title}`}
                                  title="Edit"
                                  className="min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-[36px] inline-flex items-center justify-center rounded-xl text-gray-500 hover:text-cyan-700 dark:hover:text-cyan-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {caps.canDelete && (
                                <button
                                  type="button"
                                  onClick={() => setActionTarget({ tx, mode: 'delete' })}
                                  aria-label={`${caps.deleteLabel}: ${tx.title}`}
                                  title={caps.deleteLabel}
                                  className="min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-[36px] inline-flex items-center justify-center rounded-xl text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {data && data.pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              Showing {((page - 1) * data.pagination.limit) + 1} to{' '}
              {Math.min(page * data.pagination.limit, data.pagination.total)} of{' '}
              {data.pagination.total} entries
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-semibold text-gray-700 dark:text-gray-200">
                Page {page} of {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {actionTarget && (
        <TransactionActionModal
          tx={actionTarget.tx}
          mode={actionTarget.mode}
          onClose={() => setActionTarget(null)}
          onDone={fetchTransactions}
        />
      )}

      {tagTarget && (
        <ProjectTagModal target={tagTarget} onClose={() => setTagTarget(null)} onSaved={fetchTransactions} />
      )}
    </div>
  );
};
