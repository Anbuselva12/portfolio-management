import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Palmtree,
  ArrowLeft,
  Plus,
  Share2,
  Download,
  Calendar,
  MapPin,
  Users,
  Home,
  CheckCircle2,
  Clock,
  ArrowRight,
  Trash2,
  Edit2,
  CreditCard,
  DollarSign,
  TrendingUp,
  Receipt,
  Check,
  Copy,
  Car,
  Utensils,
  Hotel,
  Ticket,
  ShoppingBag,
  Sparkles,
  X,
  ChevronDown,
} from 'lucide-react';
import clsx from 'clsx';
import { fairShareApi } from '../../api/endpoints/fairshare.api';
import {
  FairShareTrip,
  FairShareTripAnalytics,
  FairShareExpense,
  FairShareSplitMode,
  FairShareSettlementLevel,
} from '../../types';

export const FairShareTripDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<FairShareTrip | null>(null);
  const [analytics, setAnalytics] = useState<FairShareTripAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'expenses' | 'settlement' | 'households'>('expenses');
  const [rollupLevel, setRollupLevel] = useState<FairShareSettlementLevel>('family');
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState(false);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const [settlementTarget, setSettlementTarget] = useState<any>(null);

  // Expense Form State
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('general');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expDayNumber, setExpDayNumber] = useState(1);
  const [expPayerId, setExpPayerId] = useState('');
  const [expSplitMode, setExpSplitMode] = useState<FairShareSplitMode>('equal_headcount');
  const [expNotes, setExpNotes] = useState('');
  const [customSplits, setCustomSplits] = useState<
    { participant_id: string; percentage: number; amount: number; is_excluded: boolean }[]
  >([]);

  // Household Form State
  const [householdName, setHouseholdName] = useState('');

  // Participant Form State
  const [partName, setPartName] = useState('');
  const [partHouseholdId, setPartHouseholdId] = useState<string>('');

  // Settlement Form State
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMethod, setSettleMethod] = useState<'upi' | 'cash' | 'bank_transfer'>('upi');
  const [settleNotes, setSettleNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [tripData, analyticsData] = await Promise.all([
        fairShareApi.getTrip(id),
        fairShareApi.getTripAnalytics(id, rollupLevel),
      ]);
      setTrip(tripData);
      setAnalytics(analyticsData);
      if (tripData.participants.length > 0 && !expPayerId) {
        setExpPayerId(tripData.participants[0].id);
      }
    } catch (err) {
      console.error('Failed to load trip details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, rollupLevel]);

  // Sync custom splits when participants change or split modal opens
  useEffect(() => {
    if (trip && trip.participants) {
      setCustomSplits(
        trip.participants.map((p) => ({
          participant_id: p.id,
          percentage: trip.participants.length > 0 ? Number((100 / trip.participants.length).toFixed(2)) : 0,
          amount: 0,
          is_excluded: false,
        })),
      );
    }
  }, [trip?.participants]);

  const currencySymbol = useMemo(() => {
    return trip?.currency === 'INR' ? '₹' : trip?.currency || '₹';
  }, [trip?.currency]);

  const formatMoney = (val: number | string | undefined) => {
    const num = Number(val) || 0;
    return `${currencySymbol}${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  // WhatsApp Summary Copy
  const handleCopyWhatsApp = async () => {
    if (!id) return;
    try {
      const res = await fairShareApi.getWhatsAppSummary(id, rollupLevel);
      await navigator.clipboard.writeText(res.text);
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2500);
    } catch (err) {
      console.error('Failed to copy WhatsApp summary:', err);
    }
  };

  // Excel / CSV Export
  const handleExportCSV = () => {
    if (!trip || !analytics) return;

    const headers = ['Day', 'Date', 'Expense Title', 'Category', 'Paid By', 'Amount', 'Split Mode'];
    const rows = trip.expenses.map((e) => [
      `Day ${e.day_number || 1}`,
      new Date(e.expense_date).toISOString().split('T')[0],
      `"${e.title.replace(/"/g, '""')}"`,
      e.category,
      `"${e.payer?.display_name || ''}"`,
      e.amount,
      e.split_mode,
    ]);

    const settlementHeaders = ['', '', '', '', '', '', ''];
    const settlementTitle = ['SETTLEMENT PLAN (WHO PAYS WHOM)', '', '', '', '', '', ''];
    const settlementSub = ['From (Debtor)', 'To (Creditor)', 'Amount', '', '', '', ''];
    const settlementRows = analytics.simplifiedDebts.map((d) => [
      `"${d.fromName}"`,
      `"${d.toName}"`,
      d.amount,
      '',
      '',
      '',
      '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        [`"${trip.title} - FairShare Ledger"`, '', '', '', '', '', ''].join(','),
        [`"Total Spend: ${trip.currency} ${analytics.totalSpend}"`, '', '', '', '', '', ''].join(','),
        [],
        headers.join(','),
        ...rows.map((r) => r.join(',')),
        settlementHeaders.join(','),
        settlementTitle.join(','),
        settlementSub.join(','),
        ...settlementRows.map((r) => r.join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${trip.title.replace(/\s+/g, '_')}_FairShare_Ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add Expense Handler
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !expTitle.trim() || !expAmount) return;

    try {
      setSubmitting(true);
      await fairShareApi.createExpense(id, {
        payer_participant_id: expPayerId,
        title: expTitle.trim(),
        amount: Number(expAmount),
        category: expCategory,
        expense_date: expDate,
        day_number: Number(expDayNumber) || 1,
        notes: expNotes.trim() || undefined,
        split_mode: expSplitMode,
        participant_splits:
          expSplitMode === 'custom_percentage' || expSplitMode === 'exact_amounts'
            ? customSplits
            : customSplits.map((cs) => ({ participant_id: cs.participant_id, is_excluded: cs.is_excluded })),
      });

      setIsExpenseModalOpen(false);
      resetExpenseForm();
      await loadData();
    } catch (err) {
      console.error('Failed to create expense:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetExpenseForm = () => {
    setExpTitle('');
    setExpAmount('');
    setExpCategory('general');
    setExpDayNumber(1);
    setExpNotes('');
    setExpSplitMode('equal_headcount');
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!id || !window.confirm('Delete this expense?')) return;
    try {
      await fairShareApi.deleteExpense(id, expenseId);
      await loadData();
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  // Record Settlement Handler
  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !settlementTarget || !settleAmount) return;

    try {
      setSubmitting(true);
      await fairShareApi.recordSettlement(id, {
        from_entity_id: settlementTarget.fromId,
        to_entity_id: settlementTarget.toId,
        from_entity_name: settlementTarget.fromName,
        to_entity_name: settlementTarget.toName,
        entity_type: rollupLevel,
        amount: Number(settleAmount),
        payment_method: settleMethod,
        notes: settleNotes.trim() || undefined,
      });

      setIsSettlementModalOpen(false);
      setSettlementTarget(null);
      setSettleAmount('');
      setSettleNotes('');
      await loadData();
    } catch (err) {
      console.error('Failed to record settlement:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    if (!id || !window.confirm('Delete this settlement record?')) return;
    try {
      await fairShareApi.deleteSettlement(id, settlementId);
      await loadData();
    } catch (err) {
      console.error('Failed to delete settlement:', err);
    }
  };

  // Add Household
  const handleAddHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !householdName.trim()) return;
    try {
      setSubmitting(true);
      await fairShareApi.addHousehold(id, { name: householdName.trim() });
      setIsHouseholdModalOpen(false);
      setHouseholdName('');
      await loadData();
    } catch (err) {
      console.error('Failed to add household:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHousehold = async (hhId: string) => {
    if (!id || !window.confirm('Delete this family household? Members will be preserved.')) return;
    try {
      await fairShareApi.deleteHousehold(id, hhId);
      await loadData();
    } catch (err) {
      console.error('Failed to delete household:', err);
    }
  };

  // Add Participant
  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !partName.trim()) return;
    try {
      setSubmitting(true);
      await fairShareApi.addParticipant(id, {
        display_name: partName.trim(),
        household_id: partHouseholdId || undefined,
        is_guest: true,
      });
      setIsParticipantModalOpen(false);
      setPartName('');
      setPartHouseholdId('');
      await loadData();
    } catch (err) {
      console.error('Failed to add participant:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteParticipant = async (partId: string) => {
    if (!id || !window.confirm('Remove this participant?')) return;
    try {
      await fairShareApi.deleteParticipant(id, partId);
      await loadData();
    } catch (err) {
      console.error('Failed to delete participant:', err);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'travel':
        return <Car className="w-4 h-4 text-blue-500" />;
      case 'food':
        return <Utensils className="w-4 h-4 text-amber-500" />;
      case 'stay':
        return <Hotel className="w-4 h-4 text-indigo-500" />;
      case 'activities':
        return <Ticket className="w-4 h-4 text-purple-500" />;
      case 'shopping':
        return <ShoppingBag className="w-4 h-4 text-pink-500" />;
      default:
        return <Receipt className="w-4 h-4 text-emerald-500" />;
    }
  };

  if (loading || !trip || !analytics) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Clock className="w-6 h-6 animate-spin mr-2" />
        <span>Loading trip workspace...</span>
      </div>
    );
  }

  const activeBalances = rollupLevel === 'family' ? analytics.householdBalances : analytics.individualBalances;

  return (
    <div className="space-y-6 pb-16">
      {/* Top Breadcrumb & Action Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/fairshare')}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="Back to trips"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Palmtree className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">FairShare Trip</span>
                {trip.is_settled ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Fully Settled
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    Active
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{trip.title}</h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={handleCopyWhatsApp}
              className={clsx(
                'flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs min-h-[44px]',
                copiedWhatsApp
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750',
              )}
              title="Copy formatted summary with emoji for WhatsApp group"
            >
              {copiedWhatsApp ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4 text-emerald-600" />}
              <span>{copiedWhatsApp ? 'Copied for WhatsApp!' : 'Copy for WhatsApp'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-xs cursor-pointer min-h-[44px]"
              title="Export ledger and settlements to Excel / CSV"
            >
              <Download className="w-4 h-4 text-cyan-600" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {/* Sub Header Info & Rollup Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex flex-wrap items-center gap-4">
            {trip.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span>{trip.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>{trip.duration_days} Days</span>
            </div>
            <div className="flex items-center gap-1">
              <Home className="w-3.5 h-3.5 text-gray-400" />
              <span>{trip.households.length} Households</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              <span>{trip.participants.length} Participants</span>
            </div>
          </div>

          {/* Rollup Switcher Pill Toggle */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto bg-gray-100 dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
            <span className="text-[11px] font-semibold text-gray-400 px-2 shrink-0">View:</span>
            <button
              type="button"
              onClick={() => setRollupLevel('family')}
              className={clsx(
                'flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[36px]',
                rollupLevel === 'family'
                  ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
              )}
            >
              Household Level
            </button>
            <button
              type="button"
              onClick={() => setRollupLevel('individual')}
              className={clsx(
                'flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[36px]',
                rollupLevel === 'individual'
                  ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
              )}
            >
              Individual Level
            </button>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Total Spend</span>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
            {formatMoney(analytics.totalSpend)}
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">{analytics.activeExpensesCount} Expenses Logged</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
            {rollupLevel === 'family' ? 'Family Units' : 'Participants'}
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {activeBalances.length}
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">Active settlement parties</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
            Pending Settlements
          </span>
          <div className="text-2xl font-black text-amber-500 mt-1">{analytics.simplifiedDebts.length}</div>
          <span className="text-[11px] text-gray-400 mt-1 block">
            {analytics.simplifiedDebts.length === 0 ? 'All settled 🎉' : 'Transactions required'}
          </span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
            Algorithm Optimization
          </span>
          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">Greedy Max-Flow</div>
          <span className="text-[11px] text-gray-400 mt-1 block">Minimal transactions guarantee</span>
        </div>
      </div>

      {/* Navigation Tabs (Scrollable on Mobile) */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab('expenses')}
          className={clsx(
            'flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-bold transition-colors cursor-pointer shrink-0 min-h-[44px]',
            activeTab === 'expenses'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200',
          )}
        >
          <Receipt className="w-4 h-4" />
          <span>Expenses Log ({trip.expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settlement')}
          className={clsx(
            'flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-bold transition-colors cursor-pointer shrink-0 min-h-[44px]',
            activeTab === 'settlement'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200',
          )}
        >
          <DollarSign className="w-4 h-4" />
          <span>Balances & Settlements ({analytics.simplifiedDebts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('households')}
          className={clsx(
            'flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-bold transition-colors cursor-pointer shrink-0 min-h-[44px]',
            activeTab === 'households'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200',
          )}
        >
          <Home className="w-4 h-4" />
          <span>Households & Participants ({trip.participants.length})</span>
        </button>
      </div>

      {/* Tab 1: Expenses Log */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
              Chronological Expense Roll
            </h3>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Expense</span>
            </button>
          </div>

          {trip.expenses.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
              <Receipt className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <h4 className="text-base font-bold text-gray-800 dark:text-white">No Expenses Recorded Yet</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1 mb-4">
                Click Add Expense to log shared payments for transport, food, stays, or activities.
              </p>
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
              >
                Record First Expense
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {trip.expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-xs hover:border-gray-300 dark:hover:border-gray-600 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700/60 shrink-0 mt-0.5">
                      {getCategoryIcon(expense.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-gray-900 dark:text-white">{expense.title}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase">
                          Day {expense.day_number || 1}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                          {expense.split_mode.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        <span>
                          Paid by <strong className="text-gray-700 dark:text-gray-300">{expense.payer?.display_name}</strong>
                        </span>
                        <span>•</span>
                        <span>{new Date(expense.expense_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                        {expense.notes && (
                          <>
                            <span>•</span>
                            <span className="italic truncate max-w-xs">{expense.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-base font-extrabold text-gray-900 dark:text-white">
                        {formatMoney(expense.amount)}
                      </div>
                      <span className="text-[10px] text-gray-400 block">
                        {expense.splits.filter((s) => !s.is_excluded).length} participants sharing
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                      title="Delete expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Balances & Settlement ("Who Pays Whom") */}
      {activeTab === 'settlement' && (
        <div className="space-y-6">
          {/* Net Balance Status Cards */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-3">
              Net Balance by {rollupLevel === 'family' ? 'Household / Family Unit' : 'Individual Participant'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeBalances.map((entity) => {
                const net = Number(entity.netBalance);
                const isCreditor = net > 0.01;
                const isDebtor = net < -0.01;

                return (
                  <div
                    key={entity.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {entity.isHousehold ? (
                          <Home className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Users className="w-4 h-4 text-cyan-600" />
                        )}
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{entity.name}</h4>
                      </div>

                      {isCreditor ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Gets Back
                        </span>
                      ) : isDebtor ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          Owes
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          Settled
                        </span>
                      )}
                    </div>

                    <div className="text-2xl font-black mt-2">
                      <span className={clsx(isCreditor ? 'text-emerald-600 dark:text-emerald-400' : isDebtor ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400')}>
                        {isCreditor ? `+${formatMoney(net)}` : isDebtor ? `-${formatMoney(Math.abs(net))}` : formatMoney(0)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400 pt-3 mt-3 border-t border-gray-100 dark:border-gray-700">
                      <span>Paid: <strong className="text-gray-700 dark:text-gray-300">{formatMoney(entity.totalPaid)}</strong></span>
                      <span>Owes: <strong className="text-gray-700 dark:text-gray-300">{formatMoney(entity.totalOwed)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Simplified Debt Plan */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Who Pays Whom (Simplified Settlement Plan)</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Greedy debt reduction consolidated all multi-way debts down to {analytics.simplifiedDebts.length} minimal payments.
                </p>
              </div>
            </div>

            {analytics.simplifiedDebts.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/60">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-base font-bold text-emerald-800 dark:text-emerald-300">
                  All Debts are Completely Settled!
                </h4>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  Everyone has paid their exact fair share. No further transactions are required.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.simplifiedDebts.map((debt, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white flex-wrap">
                        <span className="text-rose-600 dark:text-rose-400 font-extrabold">{debt.fromName}</span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span>pays</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-base">
                          {formatMoney(debt.amount)}
                        </span>
                        <span>to</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{debt.toName}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSettlementTarget(debt);
                        setSettleAmount(debt.amount);
                        setIsSettlementModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Record Payment / Mark Paid
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settled Payment History */}
          {trip.settlements.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-3">
                Verified Settlement History
              </h3>
              <div className="space-y-2">
                {trip.settlements.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-150 dark:border-gray-700 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>
                        <strong className="text-gray-900 dark:text-white">{s.from_entity_name}</strong> paid{' '}
                        <strong className="text-emerald-600">{formatMoney(s.amount)}</strong> to{' '}
                        <strong className="text-gray-900 dark:text-white">{s.to_entity_name}</strong> via{' '}
                        <span className="uppercase font-semibold">{s.payment_method}</span>
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteSettlement(s.id)}
                      className="text-gray-400 hover:text-red-500 p-1"
                      title="Undo settlement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Households & Participants */}
      {activeTab === 'households' && (
        <div className="space-y-6">
          {/* Households Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Home className="w-4 h-4 text-emerald-600" />
                  <span>Family & Household Groups</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Individual expenses roll up to these family groups when household settlement is enabled.
                </p>
              </div>
              <button
                onClick={() => setIsHouseholdModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Family Group</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trip.households.map((h) => {
                const members = trip.participants.filter((p) => p.household_id === h.id);
                return (
                  <div
                    key={h.id}
                    className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">{h.name}</h4>
                      <button
                        onClick={() => handleDeleteHousehold(h.id)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-xs text-gray-400 mb-3">{members.length} Family Members</div>

                    <div className="space-y-1.5">
                      {members.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 text-xs"
                        >
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{m.display_name}</span>
                          <span className="text-[10px] text-gray-400">{m.is_guest ? 'Guest' : 'Linked Account'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Participants Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>All Participants</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Manage individual attendees and their household group assignments.
                </p>
              </div>
              <button
                onClick={() => setIsParticipantModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Participant</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {trip.participants.map((p) => {
                const hh = trip.households.find((h) => h.id === p.household_id);
                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{p.display_name}</div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                        <span>{hh ? hh.name : 'No Family Group'}</span>
                        <span>•</span>
                        <span>{p.is_guest ? 'Guest' : 'Member'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteParticipant(p.id)}
                      className="text-gray-400 hover:text-red-500 p-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Expense */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-xl w-full border border-gray-200 dark:border-gray-700 shadow-2xl p-5 sm:p-8 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Group Expense</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Expense Description *
                </label>
                <input
                  type="text"
                  required
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="Enter expense title (e.g., Van fare, Lunch, Resort stay)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Amount ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Paid By *
                  </label>
                  <select
                    value={expPayerId}
                    onChange={(e) => setExpPayerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {trip.participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name} {p.household ? `(${p.household.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="general">General</option>
                    <option value="travel">Travel</option>
                    <option value="food">Food & Drinks</option>
                    <option value="stay">Stay & Hotel</option>
                    <option value="activities">Activities</option>
                    <option value="shopping">Shopping</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Trip Day</label>
                  <input
                    type="number"
                    min="1"
                    max={trip.duration_days}
                    value={expDayNumber}
                    onChange={(e) => setExpDayNumber(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Split Allocation Mode
                </label>
                <select
                  value={expSplitMode}
                  onChange={(e) => setExpSplitMode(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="equal_headcount">Equally by Headcount (All Members)</option>
                  <option value="equal_family">Equally by Family Unit</option>
                  <option value="custom_percentage">Custom Percentage (Must sum to 100%)</option>
                  <option value="exact_amounts">Exact Amounts per Person</option>
                </select>
              </div>

              {/* Custom Split Matrix */}
              {(expSplitMode === 'custom_percentage' || expSplitMode === 'exact_amounts') && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    {expSplitMode === 'custom_percentage' ? 'Specify Percentage Shares (%):' : 'Specify Exact Shares (₹):'}
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {customSplits.map((cs, i) => {
                      const p = trip.participants.find((part) => part.id === cs.participant_id);
                      return (
                        <div key={cs.participant_id} className="flex items-center gap-2 text-xs">
                          <span className="flex-1 font-semibold truncate">{p?.display_name}</span>
                          <input
                            type="number"
                            step="0.1"
                            value={expSplitMode === 'custom_percentage' ? cs.percentage : cs.amount}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const updated = [...customSplits];
                              if (expSplitMode === 'custom_percentage') {
                                updated[i].percentage = val;
                              } else {
                                updated[i].amount = val;
                              }
                              setCustomSplits(updated);
                            }}
                            className="w-24 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                          />
                          <span className="text-gray-400 w-4">{expSplitMode === 'custom_percentage' ? '%' : '₹'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <input
                  type="text"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  placeholder="Optional notes or context"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Settlement */}
      {isSettlementModalOpen && settlementTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl p-5 sm:p-6 my-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Record Settlement Payment</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Recording payment from <strong className="text-rose-500">{settlementTarget.fromName}</strong> to{' '}
              <strong className="text-emerald-500">{settlementTarget.toName}</strong>.
            </p>

            <form onSubmit={handleRecordSettlement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={settleMethod}
                  onChange={(e) => setSettleMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer (IMPS / NEFT)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="UPI Ref ID or transaction note"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsSettlementModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                >
                  {submitting ? 'Recording...' : 'Confirm Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Household */}
      {isHouseholdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-sm w-full border border-gray-200 dark:border-gray-700 shadow-2xl p-5 sm:p-6 my-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Add Family Household</h3>
            <form onSubmit={handleAddHousehold} className="space-y-4">
              <input
                type="text"
                required
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="Enter family name (e.g., Family 1)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsHouseholdModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Participant */}
      {isParticipantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-sm w-full border border-gray-200 dark:border-gray-700 shadow-2xl p-5 sm:p-6 my-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Add Participant</h3>
            <form onSubmit={handleAddParticipant} className="space-y-3">
              <input
                type="text"
                required
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                placeholder="Enter participant name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <select
                value={partHouseholdId}
                onChange={(e) => setPartHouseholdId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">No Family Group (Standalone)</option>
                {trip.households.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsParticipantModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

