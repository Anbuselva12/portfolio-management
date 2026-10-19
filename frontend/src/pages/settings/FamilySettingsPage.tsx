import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { familyApi } from '../../api/endpoints/family.api';
import { CurrencyRate } from '../../types';
import {
  Users,
  Globe,
  Lock,
  Shield,
  CheckCircle2,
  Coins,
  Plus,
  Trash2,
  Sliders,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { SettingsNav } from '../../components/layout/SettingsNav';
import { useIsSolo, useWorkspaceStore } from '../../store/workspace.store';
import { FamilySelectionPage } from '../onboarding/FamilySelectionPage';

export const FamilySettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isSolo = useIsSolo();
  const workspaceLoaded = useWorkspaceStore((s) => !!s.workspace);
  const isAdmin = user?.role === 'admin';

  const [family, setFamily] = useState<any>(null);
  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [joinPolicy, setJoinPolicy] = useState<'open' | 'approval_required'>('approval_required');
  const [currencyRates, setCurrencyRates] = useState<CurrencyRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // New Currency Rate Form
  const [fromCurr, setFromCurr] = useState('USD');
  const [toCurr, setToCurr] = useState('INR');
  const [rateVal, setRateVal] = useState('84.00');
  const [isAddingRate, setIsAddingRate] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const [famData, ratesData] = await Promise.all([
        familyApi.getCurrent(),
        familyApi.getCurrencyRates(),
      ]);
      setFamily(famData);
      setIsDiscoverable(famData.is_discoverable ?? true);
      setJoinPolicy(famData.join_policy || 'approval_required');
      setCurrencyRates(ratesData || []);
    } catch {
      // defaults
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await familyApi.updateSettings({
        isDiscoverable,
        joinPolicy,
      });
      setSavedMsg('Family workspace settings successfully saved.');
      setTimeout(() => setSavedMsg(null), 3500);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update settings.');
    }
  };

  const handleAddRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !rateVal) return;
    setIsAddingRate(true);
    try {
      await familyApi.upsertCurrencyRate({
        fromCurrency: fromCurr.trim().toUpperCase(),
        toCurrency: toCurr.trim().toUpperCase(),
        rate: rateVal,
      });
      const updatedRates = await familyApi.getCurrencyRates();
      setCurrencyRates(updatedRates || []);
      setSavedMsg(`Exchange rate ${fromCurr}/${toCurr} updated.`);
      setTimeout(() => setSavedMsg(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save rate.');
    } finally {
      setIsAddingRate(false);
    }
  };

  const handleDeleteRate = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm('Delete this exchange rate entry?')) {
      try {
        await familyApi.deleteCurrencyRate(id);
        const updated = await familyApi.getCurrencyRates();
        setCurrencyRates(updated || []);
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete rate.');
      }
    }
  };

  if (isSolo) {
    return (
      <div className="max-w-5xl space-y-6 pb-12">
        <SettingsNav />
        <FamilySelectionPage embedded />
      </div>
    );
  }

  if (isLoading || !workspaceLoaded) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-600 mr-2" />
        <span>Loading workspace settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <SettingsNav />
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Family Workspace Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure household base currency, exchange rates, discovery policy, and privacy controls.
        </p>
      </div>

      {savedMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Base Currency (Consolidated Default)
              </label>
              <input
                type="text"
                disabled
                value={`${family?.base_currency || 'INR'} (₹) - Base`}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed font-mono"
              />
              <p className="mt-1 text-[11px] text-slate-400">All foreign assets and debts are converted into this currency.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Country Rule Set
              </label>
              <input
                type="text"
                disabled
                value="India (IN)"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
              />
              <p className="mt-1 text-[11px] text-slate-400">Additional country statutory rules coming post-launch.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-600" />
              <span>Discoverability & Access</span>
            </h3>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={isDiscoverable}
                onChange={(e) => setIsDiscoverable(e.target.checked)}
                className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500"
              />
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Allow family members to discover this workspace
                </span>
                <p className="text-xs text-slate-400">
                  When enabled, registered family members can locate this household and request to join.
                </p>
              </div>
            </label>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-3 border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                Join Authorization
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="radio"
                  name="joinPolicy"
                  value="approval_required"
                  disabled={!isAdmin}
                  checked={joinPolicy === 'approval_required'}
                  onChange={() => setJoinPolicy('approval_required')}
                  className="text-cyan-600"
                />
                <span>Require Admin approval before granting access to family finances</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="radio"
                  name="joinPolicy"
                  value="open"
                  disabled={!isAdmin}
                  checked={joinPolicy === 'open'}
                  onChange={() => setJoinPolicy('open')}
                  className="text-cyan-600"
                />
                <span>Open (Any user can join immediately without approval)</span>
              </label>
            </div>
          </div>

          {isAdmin && (
            <div className="pt-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 cursor-pointer shadow-sm"
              >
                Save General Settings
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Multi-Currency Exchange Rates Management Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            <span>Multi-Currency Exchange Rate Table</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Maintain point-in-time exchange conversion rates for international assets, deposits, and income streams.
          </p>
        </div>

        {/* Existing Rates Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead className="bg-slate-50 dark:bg-slate-850 text-slate-400 font-sans uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4">From Currency</th>
                <th className="py-2.5 px-4">To Base Currency</th>
                <th className="py-2.5 px-4 text-right">Conversion Rate</th>
                <th className="py-2.5 px-4 text-right">Last Updated</th>
                {isAdmin && <th className="py-2.5 px-4 text-center w-16">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currencyRates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-400 font-sans">
                    No custom exchange rates configured. Fallback rates (1 USD = ₹83.50, 1 EUR = ₹90.50) apply.
                  </td>
                </tr>
              ) : (
                currencyRates.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{r.from_currency}</td>
                    <td className="py-2.5 px-4 text-slate-500">{r.to_currency}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      1 {r.from_currency} = {Number(r.rate).toFixed(2)} {r.to_currency}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-400 font-sans text-[11px]">
                      {new Date(r.updated_at).toLocaleDateString()}
                    </td>
                    {isAdmin && (
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRate(r.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                          title="Delete rate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add / Upsert Rate Form */}
        {isAdmin && (
          <form onSubmit={handleAddRate} className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Add or Update Currency Rate
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">From Currency</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. USD, EUR, GBP"
                  value={fromCurr}
                  onChange={(e) => setFromCurr(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">To Base Currency</label>
                <input
                  type="text"
                  disabled
                  value={family?.base_currency || 'INR'}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-700 text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Exchange Rate (₹ per 1 unit)</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={rateVal}
                  onChange={(e) => setRateVal(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="text-right pt-1">
              <button
                type="submit"
                disabled={isAddingRate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 cursor-pointer shadow-sm"
              >
                {isAddingRate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Save Rate</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
