import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { familyApi } from '../../api/endpoints/family.api';
import { Users, PlusCircle, Search, Shield, CheckCircle2, Clock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Family } from '../../types';

export const FamilySelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser, setToken } = useAuthStore();

  // Create Family state
  const [familyName, setFamilyName] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('INR');
  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [joinPolicy, setJoinPolicy] = useState<'open' | 'approval_required'>('approval_required');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join Family state
  const [families, setFamilies] = useState<Family[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [isLoadingFamilies, setIsLoadingFamilies] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    loadDiscoverableFamilies();
  }, []);

  const loadDiscoverableFamilies = async () => {
    setIsLoadingFamilies(true);
    try {
      const data = await familyApi.getDiscoverable();
      setFamilies(data || []);
    } catch {
      setFamilies([]);
    } finally {
      setIsLoadingFamilies(false);
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim()) {
      setCreateError('Family name is required.');
      return;
    }
    setCreateError(null);
    setIsCreating(true);

    try {
      const res = await familyApi.create({
        name: familyName.trim(),
        baseCurrency,
        country: 'IN',
        isDiscoverable,
        joinPolicy,
      });

      if (res.accessToken) {
        setToken(res.accessToken);
      }
      if (user) {
        setUser({
          ...user,
          familyId: res.family.id,
          role: 'admin',
          status: 'active',
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to create family.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!selectedFamilyId) return;
    setJoinError(null);
    setIsJoining(true);

    try {
      await familyApi.join(selectedFamilyId);
      const selected = families.find((f) => f.id === selectedFamilyId);
      const isApproval = selected?.joinPolicy === 'approval_required';

      if (user) {
        setUser({
          ...user,
          familyId: selectedFamilyId,
          status: isApproval ? 'pending_approval' : 'active',
        });
      }

      if (isApproval) {
        navigate('/onboarding/pending');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setJoinError(err.response?.data?.message || 'Failed to send join request.');
    } finally {
      setIsJoining(false);
    }
  };

  const filteredFamilies = families.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-3">
            Step 1 of 1: Family Setup
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
            Choose your family workspace
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-base text-slate-600 dark:text-slate-400">
            Create a new family portfolio as an Administrator, or join an existing household to share finances.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Card A: Create New Family */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create a New Family</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">You will be the Family Administrator</p>
              </div>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateFamily} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Family Name
                  </label>
                  <input
                    type="text"
                    required
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="e.g. The Anbu Family"
                    className="mt-1 block w-full px-3.5 py-2.5 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Base Currency
                    </label>
                    <select
                      value={baseCurrency}
                      onChange={(e) => setBaseCurrency(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Country Rule Set
                    </label>
                    <input
                      type="text"
                      disabled
                      value="India (IN)"
                      className="mt-1 block w-full px-3 py-2 sm:text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDiscoverable}
                      onChange={(e) => setIsDiscoverable(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Allow family members to find this workspace
                    </span>
                  </label>

                  {isDiscoverable && (
                    <div className="ml-7 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2 border border-slate-200/60 dark:border-slate-700/60">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                        Join Policy
                      </div>
                      <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="radio"
                          name="joinPolicy"
                          value="approval_required"
                          checked={joinPolicy === 'approval_required'}
                          onChange={() => setJoinPolicy('approval_required')}
                          className="text-cyan-600"
                        />
                        <span>Require Admin approval before granting access (Recommended)</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="radio"
                          name="joinPolicy"
                          value="open"
                          checked={joinPolicy === 'open'}
                          onChange={() => setJoinPolicy('open')}
                          className="text-cyan-600"
                        />
                        <span>Open (Members can join immediately)</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 shadow-md shadow-cyan-600/20 disabled:opacity-60 transition-all cursor-pointer"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Create Family Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Card B: Join Existing Family */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Join an Existing Family</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Request access to your household</p>
              </div>
            </div>

            {joinError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{joinError}</span>
              </div>
            )}

            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search discoverable families..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto max-h-64 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 mb-6">
              {isLoadingFamilies ? (
                <div className="p-8 text-center text-sm text-slate-400">Loading open families...</div>
              ) : filteredFamilies.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No discoverable families found. Ask your family admin to invite you directly or create your own above.
                </div>
              ) : (
                filteredFamilies.map((fam) => (
                  <div
                    key={fam.id}
                    onClick={() => setSelectedFamilyId(fam.id)}
                    className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                      selectedFamilyId === fam.id
                        ? 'bg-teal-50 dark:bg-teal-950/40 border-l-4 border-teal-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-white">{fam.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {fam.baseCurrency} • {fam.memberCount ?? 1} member(s)
                      </div>
                    </div>
                    <div>
                      {fam.joinPolicy === 'open' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Open
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" /> Approval Required
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              disabled={!selectedFamilyId || isJoining}
              onClick={handleJoinFamily}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Join Selected Family</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
