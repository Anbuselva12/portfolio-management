import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { auditApi, AuditQueryParams } from '../../api/endpoints/audit.api';
import { AuditLogEntry } from '../../types';
import { formatDate } from '../../utils/date';
import {
  Shield,
  RotateCcw,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  FileText,
  Sparkles,
} from 'lucide-react';

export const AuditTrailPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Filters
  const [entityType, setEntityType] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, [entityType, action]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const params: AuditQueryParams = {};
      if (entityType) params.entityType = entityType;
      if (action) params.action = action;
      const data = await auditApi.getLogs(params);
      setLogs(data || []);
    } catch {
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (log: AuditLogEntry) => {
    if (!isAdmin) return;
    if (!window.confirm(`Are you sure you want to restore this ${log.entity_type} record? It will reactivate and reappear across balance sheets and dashboards.`)) {
      return;
    }

    setIsRestoringId(log.id);
    try {
      const res = await auditApi.restore(log.entity_type, log.entity_id);
      alert(res.message || 'Record successfully restored!');
      await loadLogs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to restore record.');
    } finally {
      setIsRestoringId(null);
    }
  };

  const parseFieldChanges = (jsonString?: string | null) => {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isAdmin ? 'Family Audit Trail & Change Log' : 'My Activity Log'}
            </h1>
            <span className="text-xs uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {isAdmin ? 'Admin View' : 'Personal View'}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin
              ? 'Complete immutable audit record of all household balance sheet creations, modifications, and restorations.'
              : 'Record of your personal financial changes and submissions within the family workspace.'}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter by:</span>
          </div>

          {/* Entity Type Filter */}
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">All Entities</option>
            <option value="asset">Assets</option>
            <option value="income">Income Streams</option>
            <option value="loan">Loans & Liabilities</option>
            <option value="expense">Household Expenses</option>
            <option value="insurance">Insurance Policies</option>
            <option value="member">Family Members</option>
            <option value="currency_rate">Currency Rates</option>
          </select>

          {/* Action Filter */}
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">All Actions</option>
            <option value="create">Created</option>
            <option value="update">Updated</option>
            <option value="delete">Soft-Deleted</option>
            <option value="restore">Restored</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Showing <strong className="text-slate-700 dark:text-slate-200">{logs.length}</strong> events
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
            <span>Loading audit log entries...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Shield className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No activity logged</h3>
            <p className="text-xs text-slate-500 mt-1">Actions matching the selected filters will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Timestamp</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Member</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Action</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Entity</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Changes</th>
                  {isAdmin && <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Admin Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => {
                  const isExpanded = expandedRowId === log.id;
                  const fieldDiffs = parseFieldChanges(log.field_changes);
                  const isSoftDelete = log.action === 'delete';
                  const isRestore = log.action === 'restore';

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {log.member?.display_name || 'System'}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              log.action === 'create'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : log.action === 'update'
                                ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                                : log.action === 'delete'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : log.action === 'restore'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-900 dark:text-white capitalize">
                            {log.entity_type}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 ml-1.5">
                            #{log.entity_id.slice(0, 8)}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {fieldDiffs ? (
                            <button
                              type="button"
                              onClick={() => setExpandedRowId(isExpanded ? null : log.id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide Diff' : 'View Diff'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>

                        {isAdmin && (
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {isSoftDelete && (
                              <button
                                type="button"
                                disabled={isRestoringId === log.id}
                                onClick={() => handleRestore(log)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900 cursor-pointer disabled:opacity-50"
                              >
                                {isRestoringId === log.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-3 h-3" />
                                )}
                                <span>Restore</span>
                              </button>
                            )}
                          </td>
                        )}
                      </tr>

                      {/* Expandable Field Diff Block */}
                      {isExpanded && fieldDiffs && (
                        <tr className="bg-slate-50/70 dark:bg-slate-850/40">
                          <td colSpan={isAdmin ? 6 : 5} className="py-3 px-6">
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1 font-mono">
                              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 font-sans">
                                Field Modifications
                              </div>
                              <pre className="text-slate-700 dark:text-slate-300 overflow-x-auto text-[11px]">
                                {JSON.stringify(fieldDiffs, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

