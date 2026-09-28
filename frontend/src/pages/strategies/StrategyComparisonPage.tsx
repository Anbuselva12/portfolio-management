import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { strategiesApi } from '../../api/endpoints/strategies.api';
import { familyApi } from '../../api/endpoints/family.api';
import {
  StrategyComparisonResponse,
  StrategySimulationResult,
  CustomWeights,
  SuggestionSnapshot,
} from '../../types';
import { formatINR } from '../../utils/currency';
import { StrategyCard } from '../../components/strategies/StrategyCard';
import { CustomWeightsModal } from '../../components/strategies/CustomWeightsModal';
import { StrategyTimelineOverlay } from '../../components/strategies/StrategyTimelineOverlay';
import {
  Zap,
  Sliders,
  Sparkles,
  Info,
  CreditCard,
  Plus,
  Loader2,
  Bookmark,
  CheckCircle2,
  RefreshCw,
  TrendingDown,
  Layers,
} from 'lucide-react';

export const StrategyComparisonPage: React.FC = () => {
  const navigate = useNavigate();

  const [data, setData] = useState<StrategyComparisonResponse | null>(null);
  const [activePlan, setActivePlan] = useState<SuggestionSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Surplus Override
  const [surplusInput, setSurplusInput] = useState<string>('');

  // Prepayment Mode: one_off_lump_sum vs recurring_monthly
  const [prepaymentMode, setPrepaymentMode] = useState<'one_off_lump_sum' | 'recurring_monthly'>('one_off_lump_sum');

  // AI Advisor on-demand toggle
  const [includeAi, setIncludeAi] = useState<boolean>(false);

  // Custom weights
  const [customWeights, setCustomWeights] = useState<CustomWeights>({
    weightRate: 40,
    weightBalance: 30,
    weightFlexibility: 10,
    weightPenalty: 10,
    weightTenure: 10,
    mode: 'cascade',
  });
  const [isWeightsModalOpen, setIsWeightsModalOpen] = useState(false);

  // Selected Strategies for Timeline Overlay
  const [timelineStrategyAName, setTimelineStrategyAName] = useState<string>('avalanche');
  const [timelineStrategyBName, setTimelineStrategyBName] = useState<string>('snowball');

  // Custom loan percentages slider state
  const [customLoanPercentages, setCustomLoanPercentages] = useState<Record<string, number>>({});
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSavedSuccess, setConfigSavedSuccess] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [compRes, snapRes] = await Promise.all([
        strategiesApi.compare({ customWeights, prepaymentMode: 'one_off_lump_sum', includeAi: false }),
        strategiesApi.getLatestSnapshot(),
      ]);
      setData(compRes);
      setActivePlan(snapRes);
      setSurplusInput(compRes.activeSurplus);
      if (compRes.prepaymentMode) {
        setPrepaymentMode(compRes.prepaymentMode);
      }
      const customStrat = compRes.strategies.find((s) => s.strategyName === 'custom_weighted');
      if (customStrat) {
        const initialPcts: Record<string, number> = {};
        customStrat.allocations.forEach((a) => {
          initialPcts[a.loanId] = a.percentage ?? 0;
        });
        setCustomLoanPercentages(initialPcts);
      }
    } catch {
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculate = async (
    overrideValue?: string,
    updatedWeights?: CustomWeights,
    modeOverride?: 'one_off_lump_sum' | 'recurring_monthly',
    aiOverride?: boolean,
    loanAllocationsOverride?: Record<string, number>,
  ) => {
    setIsRecalculating(true);
    try {
      const targetMode = modeOverride || prepaymentMode;
      const targetAi = aiOverride !== undefined ? aiOverride : includeAi;
      const targetAllocs = loanAllocationsOverride !== undefined ? loanAllocationsOverride : customLoanPercentages;
      const res = await strategiesApi.compare({
        surplusOverride: overrideValue !== undefined ? overrideValue : surplusInput,
        prepaymentMode: targetMode,
        customWeights: updatedWeights || customWeights,
        loanAllocations: targetAllocs,
        includeAi: targetAi,
      });
      setData(res);
      setSurplusInput(res.activeSurplus);
      if (res.prepaymentMode) {
        setPrepaymentMode(res.prepaymentMode);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to recalculate strategies.');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleLoanPercentageChange = (loanId: string, newPct: number) => {
    if (!data) return;
    const customStrat = data.strategies.find((s) => s.strategyName === 'custom_weighted');
    if (!customStrat) return;

    // Identify highest principal loan as the auto-balancing anchor
    const sortedLoans = [...customStrat.allocations].sort(
      (a, b) => Number(b.currentPrincipal) - Number(a.currentPrincipal),
    );
    const highestLoanId = sortedLoans[0]?.loanId;

    const clampedVal = Math.max(0, Math.min(100, Math.round(newPct)));
    const updated: Record<string, number> = { ...customLoanPercentages };

    if (loanId === highestLoanId) {
      updated[highestLoanId] = clampedVal;
      const remainingPct = 100 - clampedVal;
      const secondLoan = sortedLoans[1];
      if (secondLoan) {
        const otherSum = sortedLoans
          .filter((l) => l.loanId !== highestLoanId && l.loanId !== secondLoan.loanId)
          .reduce((sum, l) => sum + (updated[l.loanId] || 0), 0);
        updated[secondLoan.loanId] = Math.max(0, remainingPct - otherSum);
      }
    } else {
      updated[loanId] = clampedVal;
      const sumOthers = sortedLoans
        .filter((l) => l.loanId !== highestLoanId)
        .reduce((sum, l) => sum + (updated[l.loanId] || 0), 0);
      if (sumOthers > 100) {
        const maxAllowed = 100 - (sumOthers - clampedVal);
        updated[loanId] = Math.max(0, maxAllowed);
        updated[highestLoanId] = 0;
      } else {
        updated[highestLoanId] = Math.max(0, 100 - sumOthers);
      }
    }

    setCustomLoanPercentages(updated);
    handleRecalculate(undefined, undefined, undefined, undefined, updated);
  };

  const handleSaveCustomConfiguration = async () => {
    try {
      setIsSavingConfig(true);
      await familyApi.updateSettings({
        strategyWeights: {
          ...customWeights,
          loanPercentages: customLoanPercentages,
        },
      });
      setConfigSavedSuccess(true);
      setTimeout(() => setConfigSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save configuration.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleResetCustomConfiguration = () => {
    if (!data) return;
    const customStrat = data.strategies.find((s) => s.strategyName === 'custom_weighted');
    if (!customStrat) return;

    const sortedLoans = [...customStrat.allocations].sort(
      (a, b) => Number(b.currentPrincipal) - Number(a.currentPrincipal),
    );
    const highestLoanId = sortedLoans[0]?.loanId;

    const resetPcts: Record<string, number> = {};
    customStrat.allocations.forEach((l) => {
      resetPcts[l.loanId] = l.loanId === highestLoanId ? 100 : 0;
    });

    setCustomLoanPercentages(resetPcts);
    handleRecalculate(undefined, undefined, undefined, undefined, resetPcts);
  };

  const handleSaveWeights = async (newWeights: CustomWeights, saveAsDefault: boolean) => {
    setCustomWeights(newWeights);
    if (saveAsDefault) {
      try {
        await familyApi.updateSettings({ strategyWeights: newWeights });
      } catch {}
    }
    await handleRecalculate(undefined, newWeights);
  };

  const handleMarkAsMyPlan = async (strategy: StrategySimulationResult) => {
    if (!data) return;
    try {
      const saved = await strategiesApi.saveSnapshot({
        strategyName: strategy.strategyName,
        surplus: data.activeSurplus,
        allocations: strategy.allocations,
        metrics: {
          monthsToDebtFree: strategy.monthsToDebtFree,
          totalInterestSaved: strategy.totalInterestSaved,
          payoffDate: strategy.payoffDate,
        },
      });
      setActivePlan(saved);
      alert(`"${strategy.title}" marked as your active strategy! You can execute these payments at any time via the Prepayment Calculator on each Loan's page.`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to mark plan.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-600 mr-2" />
        <span>Evaluating household debt strategies & AI optimizations...</span>
      </div>
    );
  }

  if (!data || data.loanCount === 0) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">No active loans found</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Add active loans or liabilities to calculate Avalanche, Snowball, Custom-Weighted, and AI payoff strategies.
        </p>
        <button
          onClick={() => navigate('/loans')}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add a Loan</span>
        </button>
      </div>
    );
  }

  const allAvailableStrategies = data.strategies.filter((s) => s.strategyName !== 'baseline');
  const strategyA = allAvailableStrategies.find((s) => s.strategyName === timelineStrategyAName) || allAvailableStrategies[0];
  const strategyB = allAvailableStrategies.find((s) => s.strategyName === timelineStrategyBName) || allAvailableStrategies[1] || allAvailableStrategies[0];
  const isSurplusZero = Number(data.activeSurplus) <= 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Debt Repayment Strategy Comparison
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Compare mathematical acceleration models across <strong className="font-mono text-slate-700 dark:text-slate-200">{data.loanCount} active debts</strong> totaling <strong className="font-mono text-rose-600 dark:text-rose-400">{formatINR(data.totalDebt)}</strong>
          </p>
        </div>

        {activePlan && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 self-start sm:self-auto">
            <Bookmark className="w-4 h-4 fill-current text-emerald-600" />
            <span>Active Plan: {activePlan.strategy_name.toUpperCase()} (₹{formatINR(activePlan.surplus)}/mo)</span>
          </div>
        )}
      </div>

      {/* Prepayment Mode Selector (One-Off vs Recurring) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start">
          <button
            type="button"
            onClick={() => {
              setPrepaymentMode('one_off_lump_sum');
              handleRecalculate(undefined, undefined, 'one_off_lump_sum');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              prepaymentMode === 'one_off_lump_sum'
                ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>One-Off Lump Sum Prepayment</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPrepaymentMode('recurring_monthly');
              handleRecalculate(undefined, undefined, 'recurring_monthly');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              prepaymentMode === 'recurring_monthly'
                ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recurring Monthly Surplus</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-600 shrink-0" />
          <span>
            {prepaymentMode === 'one_off_lump_sum'
              ? 'Calculates exact lifetime interest saved & tenure shaved off if you put a single lump sum today.'
              : 'Assumes you inject this extra surplus every month with cascading acceleration.'}
          </span>
        </div>
      </div>

      {/* Available Surplus Bar & Quick Presets */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-teal-500/5 to-transparent border border-cyan-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-900 dark:text-cyan-300 flex items-center gap-1.5">
            <Zap className="w-4 h-4" />
            <span>
              {prepaymentMode === 'one_off_lump_sum'
                ? 'One-Off Prepayment Amount'
                : 'Available Monthly Debt-Payoff Surplus'}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {prepaymentMode === 'one_off_lump_sum'
              ? 'Enter extra savings or select a quick amount to see which loan saves the most interest:'
              : `Auto-calculated: Monthly Inflow − Expenses & EMIs = `}
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {prepaymentMode === 'one_off_lump_sum' ? ` ₹${formatINR(data.activeSurplus)}` : formatINR(data.autoSurplus)}
            </span>
          </p>

          {/* Quick preset buttons */}
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mr-1">Presets:</span>
            {['25000', '50000', '100000', '200000', '500000'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setSurplusInput(preset);
                  handleRecalculate(preset);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                  surplusInput === preset
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white'
                }`}
              >
                ₹{Number(preset) >= 100000 ? `${Number(preset) / 100000}L` : `${Number(preset) / 1000}k`}
              </button>
            ))}
            {Number(data.autoSurplus) > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSurplusInput(data.autoSurplus);
                  handleRecalculate(data.autoSurplus);
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-cyan-600 dark:text-cyan-400 hover:bg-white cursor-pointer"
              >
                Auto ({formatINR(data.autoSurplus)})
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 self-start lg:self-center flex-wrap">
          {/* Ask AI Advisor On-Demand Button */}
          <button
            type="button"
            onClick={() => {
              const nextAi = !includeAi;
              setIncludeAi(nextAi);
              handleRecalculate(undefined, undefined, undefined, nextAi);
            }}
            disabled={isRecalculating}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-sm ${
              includeAi
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-500'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
            title="Ask Google Gemini for personalized strategic allocation"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{includeAi ? 'AI Advisor (Active)' : 'Ask Gemini AI'}</span>
          </button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRecalculate();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">₹</span>
              <input
                type="number"
                step="any"
                min="0"
                value={surplusInput}
                onChange={(e) => setSurplusInput(e.target.value)}
                placeholder="Custom amount..."
                className="w-36 pl-7 pr-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={isRecalculating}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isRecalculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Recalculate</span>
            </button>
          </form>
        </div>
      </div>

      {/* Executive Strategy Recommendation Banner */}
      {data.summaryBanner && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-teal-500/10 border border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-emerald-800 dark:text-emerald-300">
                    Executive Strategy Verdict
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Leader: {data.summaryBanner.bestStrategyTitle}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {data.summaryBanner.recommendationVerdict}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono self-start md:self-auto shrink-0">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Max Interest Saved</div>
                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  +{formatINR(data.summaryBanner.maxInterestSaved)}
                </div>
              </div>
              {data.summaryBanner.tenureReductionMonths > 0 && (
                <div className="text-right pl-3 border-l border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Tenure Shaved</div>
                  <div className="text-sm font-black text-cyan-600 dark:text-cyan-400">
                    {data.summaryBanner.tenureReductionMonths} mos
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quickest Loan Closure Milestone Callout */}
          {data.summaryBanner.quickestLoanToClose && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white/80 dark:bg-slate-850/80 rounded-xl border border-emerald-200/80 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Fastest Debt Elimination:</strong> You can completely wipe out{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {data.summaryBanner.quickestLoanToClose.name}
                  </strong>{' '}
                  (<span className="font-mono font-bold text-rose-500">{formatINR(data.summaryBanner.quickestLoanToClose.principal)}</span>) today with this {prepaymentMode === 'one_off_lump_sum' ? 'lump sum' : 'surplus'}!
                </span>
              </div>
              <Link
                to={`/loans/${data.summaryBanner.quickestLoanToClose.loanId}`}
                className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 shrink-0"
              >
                <span>Execute Prepayment →</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Strategies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allAvailableStrategies.map((strat) => (
          <StrategyCard
            key={strat.strategyName}
            strategy={strat}
            prepaymentMode={prepaymentMode}
            isMyPlan={activePlan?.strategy_name === strat.strategyName}
            isSelectedForTimeline={
              timelineStrategyAName === strat.strategyName || timelineStrategyBName === strat.strategyName
            }
            onMarkMyPlan={() => handleMarkAsMyPlan(strat)}
            onToggleTimeline={() => {
              if (timelineStrategyAName === strat.strategyName) {
                setTimelineStrategyAName(allAvailableStrategies[0]?.strategyName || 'avalanche');
              } else if (timelineStrategyBName === strat.strategyName) {
                setTimelineStrategyBName(allAvailableStrategies[1]?.strategyName || 'snowball');
              } else {
                setTimelineStrategyBName(strat.strategyName);
              }
            }}
            onOpenWeights={strat.strategyName === 'custom_weighted' ? () => setIsWeightsModalOpen(true) : undefined}
            isSurplusZero={isSurplusZero}
            onPercentageChange={strat.strategyName === 'custom_weighted' ? handleLoanPercentageChange : undefined}
            onSaveCustomConfig={strat.strategyName === 'custom_weighted' ? handleSaveCustomConfiguration : undefined}
            onResetCustomConfig={strat.strategyName === 'custom_weighted' ? handleResetCustomConfiguration : undefined}
            isSavingConfig={isSavingConfig}
            configSavedSuccess={configSavedSuccess}
          />
        ))}
      </div>

      {/* Timeline Comparison Overlay Section */}
      <StrategyTimelineOverlay
        strategyA={strategyA}
        strategyB={strategyB}
        allStrategies={allAvailableStrategies}
        onSelectA={setTimelineStrategyAName}
        onSelectB={setTimelineStrategyBName}
      />

      {/* Custom Weights Tuning Modal */}
      <CustomWeightsModal
        isOpen={isWeightsModalOpen}
        onClose={() => setIsWeightsModalOpen(false)}
        weights={customWeights}
        onSave={handleSaveWeights}
      />
    </div>
  );
};

