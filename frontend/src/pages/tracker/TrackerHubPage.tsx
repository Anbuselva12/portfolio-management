import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackerApi } from '../../api/endpoints/tracker.api';
import { TrackerProject } from '../../types';
import { formatCurrency } from '../../utils/currency';
import {
  Building2,
  Plus,
  ArrowRight,
  RefreshCw,
  Layers,
  Calendar,
  Sparkles,
  Maximize2,
  Tag,
  AlertCircle,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import clsx from 'clsx';
import { ExpensesHubTabs } from '../../components/expenses/ExpensesHubTabs';
import { Portal } from '../../components/ui/Portal';

export const TrackerHubPage: React.FC = () => {
  const [projects, setProjects] = useState<TrackerProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Project Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('construction');
  const [description, setDescription] = useState('');
  const [totalAreaSqFt, setTotalAreaSqFt] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const navigate = useNavigate();

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await trackerApi.getProjects();
      setProjects(data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please enter a project name');
      return;
    }
    setIsCreating(true);
    setFormError(null);
    try {
      const created = await trackerApi.createProject({
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        totalAreaSqFt: totalAreaSqFt ? Number(totalAreaSqFt) : undefined,
      });
      setIsModalOpen(false);
      setName('');
      setDescription('');
      setTotalAreaSqFt('');
      await loadProjects();
      navigate(`/expenses/projects/${created.id}`);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No activity';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                Expenses
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Projects: construction, business set-ups, material accounting, funding and returns.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadProjects}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 shadow-xs cursor-pointer disabled:opacity-50"
            title="Refresh projects"
          >
            <RefreshCw className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      <ExpensesHubTabs />

      {/* Error notification */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Projects Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-600" />
          <span>Loading projects...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-gray-850 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 mx-auto flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            No projects yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-1 mb-6">
            Create your first project, such as a house construction or a new business, then tag the loans and income that belong to it.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => {
            const hasSqFt = proj.total_area_sqft && Number(proj.total_area_sqft) > 0;
            return (
              <div
                key={proj.id}
                role="link"
                tabIndex={0}
                aria-label={`Open project ${proj.name}`}
                onClick={() => navigate(`/expenses/projects/${proj.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/expenses/projects/${proj.id}`);
                  }
                }}
                className="group relative bg-white dark:bg-gray-850 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-xs hover:shadow-md hover:border-amber-400 dark:hover:border-amber-500/50 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-black text-lg shadow-xs group-hover:scale-105 transition-transform">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      {proj.code || 'Project'}
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {proj.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {proj.description || 'Commercial procurement & cost ledger'}
                  </p>

                  {/* Highlights Strip */}
                  <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Total Expenditure
                      </span>
                      <span className="text-base font-black text-gray-900 dark:text-white">
                        {formatCurrency(proj.totalSpend || '0', proj.currency)}
                      </span>
                    </div>

                    {hasSqFt ? (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Maximize2 className="w-3.5 h-3.5 text-amber-500" />
                          <span>Price per Sq Ft</span>
                        </span>
                        <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                          {formatCurrency(proj.pricePerSqFt || '0', proj.currency)} / sq ft
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Avg Cost / Item
                        </span>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {formatCurrency(proj.avgCostPerItem || '0', proj.currency)}
                        </span>
                      </div>
                    )}

                    {proj.funding && Number(proj.funding.fundedByLoans) > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-500 dark:text-gray-400">Funded by loans</span>
                        <span className="font-bold text-gray-700 dark:text-gray-300">
                          {formatCurrency(proj.funding.fundedByLoans, proj.currency)}
                          {proj.funding.fundedByLoansPct ? ` · ${Number(proj.funding.fundedByLoansPct).toFixed(0)}%` : ''}
                        </span>
                      </div>
                    )}

                    {proj.funding && Number(proj.funding.monthlyIncome) > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-500 dark:text-gray-400">Income / month</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(proj.funding.monthlyIncome, proj.currency)}
                        </span>
                      </div>
                    )}

                    {proj.funding && proj.funding.grossYieldPct !== null && Number(proj.funding.monthlyIncome) > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-500 dark:text-gray-400">Gross yield</span>
                        <span className="font-bold text-gray-700 dark:text-gray-300">{proj.funding.grossYieldPct}% p.a.</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Entries Logged</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {proj.itemsCount || 0} items
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Last: {formatDate(proj.lastActivityDate)}</span>
                  </span>
                  <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
                    <span>Open Project</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Project Modal */}
      {isModalOpen && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-5 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Create Expense Category / Project
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. House construction, New business"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Category Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. construction, business"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Total Area Sq Ft (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 3058"
                    value={totalAreaSqFt}
                    onChange={(e) => setTotalAreaSqFt(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional details, site address, scope of work..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 text-sm font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isCreating && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>Create Project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
};
