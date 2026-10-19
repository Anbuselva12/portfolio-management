import React, { useEffect, useState } from 'react';
import { insuranceApi } from '../../api/endpoints/insurance.api';
import { expensesApi } from '../../api/endpoints/expenses.api';
import { InsurancePolicy, InsurancePolicyType, PremiumFrequency, ExpenseCategory } from '../../types';
import { formatINR } from '../../utils/currency';
import { SlideDrawer } from '../../components/ui/SlideDrawer';
import {
  Shield,
  Plus,
  HeartPulse,
  Car,
  Home,
  FileText,
  Calendar,
  Trash2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

const POLICY_TYPES: { type: InsurancePolicyType; label: string; icon: any }[] = [
  { type: 'life', label: 'Life / Term Insurance', icon: Shield },
  { type: 'health', label: 'Health / Medical Cover', icon: HeartPulse },
  { type: 'vehicle', label: 'Motor / Vehicle Insurance', icon: Car },
  { type: 'home', label: 'Home / Property Insurance', icon: Home },
  { type: 'other', label: 'General / Other Insurance', icon: FileText },
];

export const InsurancePage: React.FC = () => {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Form state
  const [policyType, setPolicyType] = useState<InsurancePolicyType>('health');
  const [provider, setProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [sumAssured, setSumAssured] = useState('');
  const [premiumAmount, setPremiumAmount] = useState('');
  const [premiumFrequency, setPremiumFrequency] = useState<PremiumFrequency>('annual');
  const [nextDueDate, setNextDueDate] = useState('');
  const [linkedCategoryId, setLinkedCategoryId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pols, cats] = await Promise.all([
        insuranceApi.getAll(),
        expensesApi.getCategories(),
      ]);
      setPolicies(pols || []);
      setCategories(cats || []);
      if (cats && cats.length > 0 && !linkedCategoryId) {
        const medical = cats.find((c: ExpenseCategory) => c.name.toLowerCase().includes('medical')) || cats[0];
        setLinkedCategoryId(medical.id);
      }
    } catch {
      setPolicies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setPolicyType('health');
    setProvider('');
    setPolicyNumber('');
    setSumAssured('');
    setPremiumAmount('');
    setPremiumFrequency('annual');
    setNextDueDate(new Date().toISOString().split('T')[0]);
    setFormError(null);
    setIsDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider.trim() || !policyNumber.trim() || !sumAssured || !premiumAmount || !nextDueDate) {
      setFormError('All fields marked with an asterisk are required.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);

    try {
      await insuranceApi.create({
        policyType,
        provider: provider.trim(),
        policyNumber: policyNumber.trim(),
        sumAssured,
        premiumAmount,
        premiumFrequency,
        nextDueDate: new Date(nextDueDate).toISOString(),
        linkedCategoryId: linkedCategoryId || undefined,
      });
      setIsDrawerOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save insurance policy.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete policy ${name}?`)) return;
    try {
      await insuranceApi.remove(id);
      await loadData();
    } catch {
      alert('Failed to remove policy.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Family Insurance Protection
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tracking {policies.length} active coverage policy(s). Sum assured is kept distinct from liquid Net Worth.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 shadow-sm shadow-cyan-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Policy</span>
        </button>
      </div>

      {/* Policies Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          Loading insurance policies...
        </div>
      ) : policies.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No policies logged yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Log your health cover, term life plans, and vehicle insurance to monitor renewal dates and auto-tag premiums into expenses.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Policy</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {policies.map((policy) => {
            const typeObj = POLICY_TYPES.find((t) => t.type === policy.policyType);
            const Icon = typeObj?.icon || Shield;
            const dueDate = new Date(policy.nextDueDate);
            const isDueSoon = (dueDate.getTime() - Date.now()) / (1000 * 3600 * 24) <= 30;

            return (
              <div
                key={policy.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                      <button
                        onClick={() => handleDelete(policy.id, policy.provider)}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete policy"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {policy.provider}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    Policy #{policy.policyNumber}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div>
                      <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                        Sum Assured (Coverage)
                      </div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                        {formatINR(policy.sumAssured)}
                      </div>
                      <div className="text-[10px] text-slate-400 italic">
                        Not added to liquid Net Worth
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Premium:</span>
                      <span className="font-semibold text-slate-900 dark:text-white font-mono">
                        {formatINR(policy.premiumAmount)} ({policy.premiumFrequency})
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Next Renewal:</span>
                      <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dueDate.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  {isDueSoon ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3" /> Due in &le; 30 Days
                    </span>
                  ) : (
                    <span className="text-slate-400">Next cycle scheduled</span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px] text-cyan-600 dark:text-cyan-400">
                    <Sparkles className="w-3 h-3" /> Auto-expense ready
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Policy Drawer */}
      <SlideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Add Insurance Policy"
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
              Policy Type *
            </label>
            <select
              value={policyType}
              onChange={(e) => setPolicyType(e.target.value as InsurancePolicyType)}
              className="mt-1 block w-full px-3 py-2.5 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {POLICY_TYPES.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Insurance Provider / Company *
            </label>
            <input
              type="text"
              required
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="Enter the insurer name"
              className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Policy Number *
            </label>
            <input
              type="text"
              required
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              placeholder="e.g. POL-9921401"
              className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Sum Assured (₹) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={sumAssured}
                onChange={(e) => setSumAssured(e.target.value)}
                placeholder="1000000"
                className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Premium Amount (₹) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={premiumAmount}
                onChange={(e) => setPremiumAmount(e.target.value)}
                placeholder="18000"
                className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Payment Frequency
              </label>
              <select
                value={premiumFrequency}
                onChange={(e) => setPremiumFrequency(e.target.value as PremiumFrequency)}
                className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="annual">Annual</option>
                <option value="quarterly">Quarterly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Next Due Date *
              </label>
              <input
                type="date"
                required
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Linked Expense Category
            </label>
            <select
              value={linkedCategoryId}
              onChange={(e) => setLinkedCategoryId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              When premium is due, an expense entry will be auto-generated in this category with an insurance tag.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
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
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save Policy</span>
            </button>
          </div>
        </form>
      </SlideDrawer>
    </div>
  );
};
