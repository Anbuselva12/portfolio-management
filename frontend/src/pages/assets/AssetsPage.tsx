import React, { useEffect, useState } from 'react';
import { assetsApi } from '../../api/endpoints/assets.api';
import { Asset, AssetType } from '../../types';
import { formatINR } from '../../utils/currency';
import { SlideDrawer } from '../../components/ui/SlideDrawer';
import {
  Briefcase,
  Plus,
  Landmark,
  PiggyBank,
  TrendingUp,
  LineChart,
  Shield,
  Coins,
  Building,
  MoreVertical,
  Pencil,
  Trash2,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const ASSET_TYPES: { type: AssetType; label: string; icon: any }[] = [
  { type: 'bank_balance', label: 'Bank Account Balance', icon: Landmark },
  { type: 'fd', label: 'Fixed Deposit (FD)', icon: PiggyBank },
  { type: 'rd', label: 'Recurring Deposit (RD)', icon: PiggyBank },
  { type: 'mutual_fund', label: 'Mutual Fund', icon: TrendingUp },
  { type: 'stocks', label: 'Stocks / Equity', icon: LineChart },
  { type: 'pf', label: 'Provident Fund (EPF / PPF)', icon: Shield },
  { type: 'nps', label: 'National Pension Scheme (NPS)', icon: Shield },
  { type: 'gold', label: 'Physical / Digital Gold', icon: Coins },
  { type: 'real_estate', label: 'Real Estate / Land', icon: Building },
  { type: 'other', label: 'Other Asset', icon: Briefcase },
];

export const AssetsPage: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('bank_balance');
  const [currency, setCurrency] = useState('INR');
  const [currentValue, setCurrentValue] = useState('');
  const [principalInvested, setPrincipalInvested] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const data = await assetsApi.getAll();
      setAssets(data || []);
    } catch {
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingAsset(null);
    setName('');
    setType('bank_balance');
    setCurrency('INR');
    setCurrentValue('');
    setPrincipalInvested('');
    setInterestRate('');
    setMaturityDate('');
    setNotes('');
    setFormError(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setName(asset.name);
    setType(asset.type);
    setCurrency(asset.currency || 'INR');
    setCurrentValue(asset.currentValue || '');
    setPrincipalInvested(asset.principalInvested || '');
    setInterestRate(asset.interestRate || '');
    setMaturityDate(asset.maturityDate ? asset.maturityDate.split('T')[0] : '');
    setNotes(asset.notes || '');
    setFormError(null);
    setIsDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentValue) {
      setFormError('Asset name and current value are required.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);

    const payload = {
      name: name.trim(),
      type,
      currency,
      currentValue,
      principalInvested: principalInvested ? principalInvested : undefined,
      interestRate: interestRate ? interestRate : undefined,
      maturityDate: maturityDate ? maturityDate : undefined,
      notes: notes ? notes : undefined,
    };

    try {
      if (editingAsset) {
        await assetsApi.update(editingAsset.id, payload);
      } else {
        await assetsApi.create(payload);
      }
      setIsDrawerOpen(false);
      await loadAssets();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save asset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, assetName: string) => {
    if (!confirm(`Are you sure you want to remove "${assetName}"? This record can be restored from the Audit Trail.`)) return;
    try {
      await assetsApi.remove(id);
      await loadAssets();
    } catch {
      alert('Failed to delete asset.');
    }
  };

  const totalAssetValue = assets.reduce((sum, a) => sum + Number(a.currentValue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Family Assets
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Total portfolio valuation: <span className="font-semibold text-slate-900 dark:text-white font-mono">{formatINR(totalAssetValue)}</span> across {assets.length} holding(s)
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 shadow-sm shadow-cyan-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Asset</span>
        </button>
      </div>

      {/* Asset Table / List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading assets...</div>
        ) : assets.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No assets recorded yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Start building your portfolio picture by adding your bank balances, savings accounts, or deposits.
            </p>
            <button
              onClick={handleOpenAdd}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Asset</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="stack-mobile w-full text-left border-collapse text-sm min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Asset Name & Type</th>
                  <th className="py-3.5 px-6">Current Value</th>
                  <th className="py-3.5 px-6">Projected / Rate</th>
                  <th className="py-3.5 px-6">Maturity Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {assets.map((asset) => {
                  const typeObj = ASSET_TYPES.find((t) => t.type === asset.type);
                  const Icon = typeObj?.icon || Briefcase;

                  return (
                    <tr key={asset.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{asset.name}</div>
                            <div className="text-xs text-slate-400">{typeObj?.label || asset.type}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Value" className="py-4 px-6">
                        <div className="font-bold text-slate-900 dark:text-white font-mono text-base">
                          {formatINR(asset.currentValue)}
                        </div>
                        {asset.principalInvested && (
                          <div className="text-xs text-slate-400">
                            Invested: {formatINR(asset.principalInvested)}
                          </div>
                        )}
                      </td>
                      <td data-label="Rate" className="py-4 px-6 text-slate-600 dark:text-slate-300">
                        {asset.interestRate ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                            {asset.interestRate}% p.a.
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                        {asset.projectedMaturityValue && (
                          <div className="text-xs text-slate-400 mt-1">
                            Proj: {formatINR(asset.projectedMaturityValue)}
                          </div>
                        )}
                      </td>
                      <td data-label="Maturity" className="py-4 px-6 text-slate-600 dark:text-slate-300 text-xs">
                        {asset.maturityDate ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{new Date(asset.maturityDate).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td data-actions className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(asset)}
                            className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit Asset"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(asset.id, asset.name)}
                            className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete Asset"
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

      {/* Add / Edit Drawer */}
      <SlideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingAsset ? 'Edit Asset' : 'Add New Asset'}
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
              Asset Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AssetType)}
              className="mt-1 block w-full px-3 py-2.5 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {ASSET_TYPES.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Asset Name / Reference
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HDFC Salary Account / SBI FD #4102"
              className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Current Value (₹)
              </label>
              <input
                type="number"
                step="any"
                required
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder="250000"
                className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Principal Invested (Optional)
              </label>
              <input
                type="number"
                step="any"
                value={principalInvested}
                onChange={(e) => setPrincipalInvested(e.target.value)}
                placeholder="200000"
                className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>
          </div>

          {['fd', 'rd', 'pf', 'nps'].includes(type) && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Interest Rate (% p.a.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="7.25"
                  className="mt-1 block w-full px-3 py-1.5 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Maturity Date
                </label>
                <input
                  type="date"
                  value={maturityDate}
                  onChange={(e) => setMaturityDate(e.target.value)}
                  className="mt-1 block w-full px-3 py-1.5 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Notes / Account Reference
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Joint account with spouse"
              className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
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
              <span>{editingAsset ? 'Save Changes' : 'Add Asset'}</span>
            </button>
          </div>
        </form>
      </SlideDrawer>
    </div>
  );
};
