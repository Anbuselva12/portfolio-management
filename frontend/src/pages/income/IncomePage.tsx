import React, { useEffect, useState } from 'react';
import { incomeApi } from '../../api/endpoints/income.api';
import { trackerApi } from '../../api/endpoints/tracker.api';
import { IncomeEntry, IncomeType, IncomeRecurrence, TrackerProject } from '../../types';
import { formatINR } from '../../utils/currency';
import { SlideDrawer } from '../../components/ui/SlideDrawer';
import { RecordReceiptModal } from '../../components/income/RecordReceiptModal';
import {
  TrendingUp,
  Plus,
  Briefcase,
  Building,
  PiggyBank,
  Pencil,
  StopCircle,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  Tag,
  CalendarPlus,
} from 'lucide-react';

const INCOME_TYPES: { type: IncomeType; label: string }[] = [
  { type: 'salary', label: 'Salary / Employment' },
  { type: 'rent', label: 'Rental Income' },
  { type: 'dividend', label: 'Dividend / Stock Payout' },
  { type: 'interest', label: 'Interest (FD/Savings)' },
  { type: 'freelance', label: 'Freelance / Consulting' },
  { type: 'other', label: 'Other Income' },
];

export const IncomePage: React.FC = () => {
  const [incomes, setIncomes] = useState<IncomeEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'recurring' | 'one_off'>('recurring');
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeEntry | null>(null);
  const [receiptIncome, setReceiptIncome] = useState<IncomeEntry | null>(null);

  // Form state
  const [label, setLabel] = useState('');
  const [type, setType] = useState<IncomeType>('salary');
  const [amount, setAmount] = useState('');
  const [recurrence, setRecurrence] = useState<IncomeRecurrence>('recurring_monthly');
  const [startDate, setStartDate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [dueDayOfMonth, setDueDayOfMonth] = useState<number>(5);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<TrackerProject[]>([]);

  useEffect(() => {
    loadIncomes();
    // Projects are optional context: income still works if they fail to load.
    trackerApi.getProjects().then((list) => setProjects(list || [])).catch(() => setProjects([]));
  }, []);

  const projectNameById = (id?: string | null) => projects.find((p) => p.id === id)?.name;

  const loadIncomes = async () => {
    setIsLoading(true);
    try {
      const data = await incomeApi.getAll();
      setIncomes(data || []);
    } catch {
      setIncomes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingIncome(null);
    setLabel('');
    setType('salary');
    setAmount('');
    setRecurrence(activeTab === 'recurring' ? 'recurring_monthly' : 'one_off');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEffectiveDate(new Date().toISOString().split('T')[0]);
    setRemindersEnabled(true);
    setDueDayOfMonth(new Date().getDate());
    setProjectId('');
    setFormError(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (income: any) => {
    setEditingIncome(income);
    setLabel(income.label);
    setType(income.type);
    setAmount(income.amount || '');
    setRecurrence(income.recurrence);
    setStartDate(income.startDate ? income.startDate.split('T')[0] : '');
    setEffectiveDate(new Date().toISOString().split('T')[0]);
    setRemindersEnabled(income.reminders_enabled !== undefined ? income.reminders_enabled : true);
    setDueDayOfMonth(income.due_day_of_month || 5);
    setProjectId(income.project_id || '');
    setFormError(null);
    setIsDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !amount) {
      setFormError('Label and amount are required.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingIncome) {
        // If recurring edit: supersession flow
        await incomeApi.update(editingIncome.id, {
          label: label.trim(),
          amount,
          type,
          remindersEnabled,
          dueDayOfMonth: Number(dueDayOfMonth),
          projectId: projectId || null,
          effectiveDate: recurrence === 'recurring_monthly' ? effectiveDate : undefined,
        });
      } else {
        await incomeApi.create({
          label: label.trim(),
          amount,
          type,
          recurrence,
          remindersEnabled,
          dueDayOfMonth: Number(dueDayOfMonth),
          startDate: new Date(startDate).toISOString(),
          currency: 'INR',
          projectId: projectId || undefined,
        });
      }
      setIsDrawerOpen(false);
      await loadIncomes();
    } catch (err: any) {
      const rawMsg = err.response?.data?.message || err.response?.data?.error?.message || err.response?.data?.error;
      const displayMsg = Array.isArray(rawMsg)
        ? rawMsg.join(', ')
        : typeof rawMsg === 'string'
        ? rawMsg
        : typeof rawMsg === 'object'
        ? JSON.stringify(rawMsg)
        : 'Failed to save income entry.';
      setFormError(displayMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStop = async (id: string, itemLabel: string) => {
    const stopDateStr = prompt(`Stop recurring income "${itemLabel}" as of which date? (YYYY-MM-DD):`, new Date().toISOString().split('T')[0]);
    if (!stopDateStr) return;

    try {
      await incomeApi.stop(id, stopDateStr);
      await loadIncomes();
    } catch {
      alert('Failed to stop recurring income.');
    }
  };

  const handleDelete = async (id: string, itemLabel: string) => {
    if (window.confirm(`Are you sure you want to delete "${itemLabel}"? (This can be restored from the Audit Trail)`)) {
      try {
        await incomeApi.remove(id);
        if (editingIncome?.id === id) {
          setIsDrawerOpen(false);
        }
        await loadIncomes();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete income stream.');
      }
    }
  };

  const formatDisplayDate = (dStr?: string | null) => {
    if (!dStr) return 'N/A';
    const d = new Date(dStr);
    return !isNaN(d.getTime()) ? d.toLocaleDateString() : 'N/A';
  };

  const filteredIncomes = incomes.filter((i) =>
    activeTab === 'recurring' ? i.recurrence === 'recurring_monthly' : i.recurrence === 'one_off'
  );

  const activeMonthlyTotal = incomes
    .filter((i) => i.recurrence === 'recurring_monthly' && i.status === 'active')
    .reduce((sum, i) => sum + Number(i.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Family Income Streams
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Active monthly recurring: <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{formatINR(activeMonthlyTotal)}/mo</span>
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Income</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('recurring')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'recurring'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Recurring Monthly Income
          </button>
          <button
            onClick={() => setActiveTab('one_off')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === 'one_off'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            One-Off Incomes
          </button>
        </nav>
      </div>

      {/* Income List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading income records...</div>
        ) : filteredIncomes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {activeTab === 'recurring' ? 'No recurring income logged yet' : 'No one-off incomes logged yet'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Add your salary, rental property revenues, or freelance receipts to track cash inflow.
            </p>
            <button
              onClick={handleOpenAdd}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Income Stream</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="stack-mobile w-full text-left border-collapse text-sm min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Source & Label</th>
                  <th className="py-3.5 px-6">Amount</th>
                  <th className="py-3.5 px-6">Status / Recurrence</th>
                  <th className="py-3.5 px-6">Start Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredIncomes.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900 dark:text-white">{item.label}</div>
                      <div className="text-xs text-slate-400 capitalize">{item.type}</div>
                      {projectNameById(item.project_id) && (
                        <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                          <Tag className="w-3 h-3" /> {projectNameById(item.project_id)}
                        </span>
                      )}
                    </td>
                    <td data-label="Amount" className="py-4 px-6 font-bold text-slate-900 dark:text-white font-mono text-base">
                      <span>
                        {formatINR(item.amount)}
                        <span className="text-xs font-normal text-slate-400">
                          {item.recurrence === 'recurring_monthly' ? '/mo' : ''}
                        </span>
                      </span>
                    </td>
                    <td data-label="Status" className="py-4 px-6">
                      {item.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : item.status === 'superseded' ? (
                        <span className="inline-flex items-center text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          Superseded (History)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> Stopped
                        </span>
                      )}
                    </td>
                    <td data-label="Start" className="py-4 px-6 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDisplayDate(item.startDate || (item as any).start_date)}</span>
                      </div>
                      {item.recurrence === 'recurring_monthly' && (
                        (item as any).reminders_enabled !== false ? (
                          <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-full mt-1 border border-cyan-200 dark:border-cyan-800">
                            <span>Remind on Day {(item as any).due_day_of_month || 1}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-1">Reminders disabled</div>
                        )
                      )}
                      {item.endDate && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Ended: {formatDisplayDate(item.endDate || (item as any).end_date)}
                        </div>
                      )}
                    </td>
                    <td data-actions className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-1">
                        {item.recurrence === 'recurring_monthly' && (
                          <button
                            type="button"
                            onClick={() => setReceiptIncome(item)}
                            className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                            title="Record a past receipt"
                            aria-label={`Record a past receipt for ${item.label}`}
                          >
                            <CalendarPlus className="w-4 h-4" />
                          </button>
                        )}
                        {item.status === 'active' && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Edit Income"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {item.recurrence === 'recurring_monthly' && (
                              <button
                                onClick={() => handleStop(item.id, item.label)}
                                className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                                title="Stop Recurring Stream"
                              >
                                <StopCircle className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(item.id, item.label)}
                          className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Income (Can be restored from Audit Trail)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {receiptIncome && (
        <RecordReceiptModal income={receiptIncome} onClose={() => setReceiptIncome(null)} onSaved={() => undefined} />
      )}

      {/* Add / Edit Drawer */}
      <SlideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingIncome ? 'Edit Income Stream' : 'Add Income Stream'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Income Source Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as IncomeType)}
              className="mt-1 block w-full px-3 py-2.5 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {INCOME_TYPES.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Description / Label
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Primary Salary / Flat 402 Rent"
              className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Amount (₹)
            </label>
            <input
              type="number"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="85000"
              className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>

          <div>
            <label htmlFor="income-project" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Project (optional)
            </label>
            <select
              id="income-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-1 block w-full px-3 py-2.5 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">Tag rent or business income to a project to track its return. All receipts of this stream follow the tag.</p>
          </div>

          {!editingIncome && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Recurrence Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRecurrence('recurring_monthly')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    recurrence === 'recurring_monthly'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span>Recurring Monthly</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRecurrence('one_off')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    recurrence === 'one_off'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span>One-Off / Bonus</span>
                </button>
              </div>
            </div>
          )}

          {!editingIncome && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {recurrence === 'recurring_monthly' ? 'Starting Date' : 'Payout Date'}
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {editingIncome && editingIncome.recurrence === 'recurring_monthly' && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60">
              <label className="block text-xs font-bold text-amber-800 dark:text-amber-300">
                Effective Date of Change (Supersession)
              </label>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 mb-2">
                Per financial rules, the current stream will close the day before this date and a new stream begins, preserving your historical trend charts.
              </p>
              <input
                type="date"
                required
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="block w-full px-3 py-1.5 sm:text-sm rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          {recurrence === 'recurring_monthly' && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Dashboard Arrival Reminders
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Show in monthly reminders queue on Home page with option to modify received amount.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remindersEnabled}
                    onChange={(e) => setRemindersEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-cyan-600"></div>
                </label>
              </div>

              {remindersEnabled && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Expected Arrival Day of Month (1 - 31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDayOfMonth}
                    onChange={(e) => setDueDayOfMonth(Math.max(1, Math.min(31, Number(e.target.value))))}
                    className="mt-1 block w-28 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              )}
            </div>
          )}

          <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
            {editingIncome ? (
              <button
                type="button"
                onClick={() => handleDelete(editingIncome.id, editingIncome.label)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Income</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{editingIncome ? 'Apply Update' : 'Save Income'}</span>
              </button>
            </div>
          </div>
        </form>
      </SlideDrawer>
    </div>
  );
};
