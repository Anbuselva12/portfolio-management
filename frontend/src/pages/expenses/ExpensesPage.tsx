import React, { useEffect, useState } from 'react';
import { expensesApi } from '../../api/endpoints/expenses.api';
import { ExpenseEntry, ExpenseCategory } from '../../types';
import { formatINR } from '../../utils/currency';
import { useIsFamily } from '../../store/workspace.store';
import { SlideDrawer } from '../../components/ui/SlideDrawer';
import {
  Receipt,
  Plus,
  Tag,
  Calendar,
  Sparkles,
  Trash2,
  AlertCircle,
  Loader2,
  FolderPlus,
} from 'lucide-react';
import { ExpensesHubTabs } from '../../components/expenses/ExpensesHubTabs';

export const ExpensesPage: React.FC = () => {
  const isFamily = useIsFamily();
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Drawers
  const [isExpenseDrawerOpen, setIsExpenseDrawerOpen] = useState(false);
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);

  // Add Expense form state
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  // Add Category form state
  const [newCatName, setNewCatName] = useState('');
  const [catError, setCatError] = useState<string | null>(null);
  const [isSavingCat, setIsSavingCat] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cats, exps] = await Promise.all([
        expensesApi.getCategories(),
        expensesApi.getAll(selectedMonth),
      ]);
      setCategories(cats || []);
      setExpenses(exps || []);
      if (cats && cats.length > 0 && !categoryId) {
        setCategoryId(cats[0].id);
      }
    } catch {
      setExpenses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId) {
      setExpenseError('Amount and category are required.');
      return;
    }
    setExpenseError(null);
    setIsSavingExpense(true);

    try {
      await expensesApi.create({
        amount,
        categoryId,
        date: new Date(date).toISOString(),
        currency: 'INR',
        notes: notes.trim() || undefined,
      });
      setIsExpenseDrawerOpen(false);
      setAmount('');
      setNotes('');
      await loadData();
    } catch (err: any) {
      setExpenseError(err.response?.data?.message || 'Failed to record expense.');
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setCatError('Category name is required.');
      return;
    }
    setCatError(null);
    setIsSavingCat(true);

    try {
      await expensesApi.createCategory({
        name: newCatName.trim(),
      });
      setNewCatName('');
      const updatedCats = await expensesApi.getCategories();
      setCategories(updatedCats || []);
    } catch (err: any) {
      setCatError(err.response?.data?.message || 'Failed to create category.');
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await expensesApi.remove(id);
      await loadData();
    } catch {
      alert('Failed to remove expense.');
    }
  };

  const filteredExpenses = expenses
    .filter((e) => (e as any).source !== 'loan_emi_auto')
    .filter((e) => (selectedCategory === 'all' ? true : e.categoryId === selectedCategory));

  const totalMonthlySpend = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <div className="space-y-6">
      <ExpensesHubTabs />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Household Expenses
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Total spending for {selectedMonth}: <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">{formatINR(totalMonthlySpend)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => setIsCategoryDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Tag className="w-4 h-4 text-slate-500" />
            <span>Manage Categories</span>
          </button>
          <button
            onClick={() => setIsExpenseDrawerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expense List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading expenditures...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No expenses recorded for this month</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Track daily groceries, electricity bills, and fuel to keep your household budget accurate.
            </p>
            <button
              onClick={() => setIsExpenseDrawerOpen(true)}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log First Expense</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="stack-mobile w-full text-left border-collapse text-sm min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Notes / Description</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Amount</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredExpenses.map((exp) => {
                  const cat = categories.find((c) => c.id === exp.categoryId);
                  const isAutoInsurance = exp.source === 'insurance_auto';
                  const isAutoEmi = (exp as any).source === 'loan_emi_auto';
                  const isPaidEmi = isAutoEmi && Boolean((exp as any).is_paid);

                  return (
                    <tr
                      key={exp.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${isPaidEmi ? 'opacity-60' : ''}`}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold ${isPaidEmi ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                            {cat?.name || (isAutoEmi ? 'Loan EMI' : 'General Expense')}
                          </span>
                          {isAutoInsurance && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950 px-2 py-0.5 rounded-full">
                              <Sparkles className="w-3 h-3" /> Auto (Insurance)
                            </span>
                          )}
                          {isAutoEmi && (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${isPaidEmi ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950' : 'text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950'}`}>
                              <Sparkles className="w-3 h-3" /> {isPaidEmi ? '✓ EMI Paid' : 'Auto (Loan EMI)'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td data-label="Notes" className="py-4 px-6 text-slate-700 dark:text-slate-200 text-xs">
                        {exp.notes || <span className="text-slate-400 italic">No notes</span>}
                      </td>
                      <td data-label="Date" className="py-4 px-6 text-slate-600 dark:text-slate-400 text-xs font-mono">
                        {new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td data-label="Amount" className={`py-4 px-6 font-bold font-mono text-base ${isPaidEmi ? 'text-slate-400 line-through' : 'text-rose-600 dark:text-rose-400'}`}>
                        -{formatINR(exp.amount)}
                      </td>
                      <td data-actions className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAutoEmi && (
                            <button
                              onClick={async () => {
                                try {
                                  await expensesApi.markEmiPaid(exp.id, !isPaidEmi);
                                  await loadData();
                                } catch { alert('Failed to update EMI payment status.'); }
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors ${isPaidEmi ? 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-950' : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'}`}
                              title={isPaidEmi ? 'Mark as Unpaid' : 'Mark as Paid'}
                            >
                              {isPaidEmi ? 'Unmark' : 'Mark Paid'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Expense Drawer */}
      <SlideDrawer
        isOpen={isExpenseDrawerOpen}
        onClose={() => setIsExpenseDrawerOpen(false)}
        title="Log an Expense"
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          {expenseError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{expenseError}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Category
            </label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
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
              placeholder="1250"
              className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Notes / Payee
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Weekly supermarket visit"
              className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsExpenseDrawerOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingExpense}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSavingExpense && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save Expense</span>
            </button>
          </div>
        </form>
      </SlideDrawer>

      {/* Category Manager Drawer */}
      <SlideDrawer
        isOpen={isCategoryDrawerOpen}
        onClose={() => setIsCategoryDrawerOpen(false)}
        title={isFamily ? 'Family Expense Categories' : 'Expense Categories'}
      >
        <div className="space-y-6">
          <form onSubmit={handleAddCategory} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5">
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Add Custom Category</span>
            </div>
            {catError && <p className="text-xs text-rose-600">{catError}</p>}
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Pet Care / Hobbies"
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="submit"
                disabled={isSavingCat}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer transition-colors"
              >
                Add
              </button>
            </div>
          </form>

          <div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Current Categories ({categories.length})
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              {categories.map((c) => (
                <div key={c.id} className="p-3 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">{c.name}</span>
                  <span className="text-xs text-slate-400">Shared taxonomy</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SlideDrawer>
    </div>
  );
};
