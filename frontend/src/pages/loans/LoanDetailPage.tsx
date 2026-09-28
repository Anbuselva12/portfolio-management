import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loansApi } from '../../api/endpoints/loans.api';
import { Loan, RepaymentInstallment, RateRevisionRecord, PrepaymentRecord } from '../../types';
import { formatINR } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { DiscrepancyBanner } from '../../components/loans/DiscrepancyBanner';
import { PrepaymentCalculatorModal } from '../../components/loans/PrepaymentCalculatorModal';
import { RateRevisionModal } from '../../components/loans/RateRevisionModal';
import { PartPaymentModal } from '../../components/loans/PartPaymentModal';
import { CalibrateLoanModal } from '../../components/loans/CalibrateLoanModal';
import { SlideDrawer } from '../../components/ui/SlideDrawer';
import {
  ArrowLeft,
  Calendar,
  Percent,
  Calculator,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Loader2,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  PlusCircle,
  SlidersHorizontal,
  History,
  FileText,
  BadgePercent,
} from 'lucide-react';

export const LoanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<RepaymentInstallment[]>([]);
  const [rateRevisions, setRateRevisions] = useState<RateRevisionRecord[]>([]);
  const [prepayments, setPrepayments] = useState<PrepaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isPrepaymentOpen, setIsPrepaymentOpen] = useState(false);
  const [isRateRevisionOpen, setIsRateRevisionOpen] = useState(false);
  const [isPartPaymentOpen, setIsPartPaymentOpen] = useState(false);
  const [isCalibrateOpen, setIsCalibrateOpen] = useState(false);

  // Edit Loan Drawer
  const [isEditLoanOpen, setIsEditLoanOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPlace, setEditPlace] = useState('');
  const [editComments, setEditComments] = useState('');
  const [editLender, setEditLender] = useState('');
  const [editRate, setEditRate] = useState('');
  const [editTenure, setEditTenure] = useState<number>(0);
  const [editEmiType, setEditEmiType] = useState<'fixed' | 'flexible'>('fixed');
  const [editStatus, setEditStatus] = useState<any>('active');
  const [isSavingTerms, setIsSavingTerms] = useState(false);

  // Edit Installment Modal
  const [editingInstallment, setEditingInstallment] = useState<RepaymentInstallment | null>(null);
  const [instEmi, setInstEmi] = useState('');
  const [instPrincipal, setInstPrincipal] = useState('');
  const [instInterest, setInstInterest] = useState('');
  const [instPaid, setInstPaid] = useState(false);
  const [instNotes, setInstNotes] = useState('');
  const [isSavingInstallment, setIsSavingInstallment] = useState(false);

  // Table Filters & Jump & View Tab
  const [filterMode, setFilterMode] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [jumpMonth, setJumpMonth] = useState('');
  const [activeTab, setActiveTab] = useState<'schedule' | 'events'>('schedule');

  // Gold Loan State & Modals
  const [goldLedger, setGoldLedger] = useState<any>(null);
  const [isAddGoldPaymentOpen, setIsAddGoldPaymentOpen] = useState(false);
  const [goldPayDate, setGoldPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [goldPayAmount, setGoldPayAmount] = useState('');
  const [goldPayNotes, setGoldPayNotes] = useState('');
  const [isSubmittingGoldPayment, setIsSubmittingGoldPayment] = useState(false);
  const [quoteDate, setQuoteDate] = useState('');
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [isCalculatingQuote, setIsCalculatingQuote] = useState(false);

  useEffect(() => {
    if (id) {
      loadLoanData();
    }
  }, [id]);

  const loadLoanData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [loanData, scheduleData, revisionsData, prepaymentsData] = await Promise.all([
        loansApi.getById(id),
        loansApi.getSchedule(id),
        loansApi.getRateRevisions(id).catch(() => []),
        loansApi.getPrepayments(id).catch(() => []),
      ]);
      setLoan(loanData);
      setSchedule(scheduleData || []);
      setRateRevisions(revisionsData || []);
      setPrepayments(prepaymentsData || []);

      if (loanData.type === 'jewel' || loanData.type === 'gold') {
        try {
          const ledger = await loansApi.getGoldLoanLedger(id);
          setGoldLedger(ledger);
        } catch (e) {
          console.error('Failed to load gold loan ledger', e);
        }
      }

      // Prep edit terms form
      setEditName((loanData as any).name || loanData.lender || '');
      setEditPlace((loanData as any).place_or_purpose || (loanData as any).placeOrPurpose || '');
      setEditComments((loanData as any).comments || '');
      setEditLender(loanData.lender);
      setEditRate(loanData.interestRate || loanData.interest_rate || '');
      setEditTenure(loanData.tenureMonths || loanData.tenure_months || 0);
      setEditEmiType(loanData.emiType || loanData.emi_type || 'fixed');
      setEditStatus(loanData.status || 'active');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load loan details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGoldPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !goldPayAmount || Number(goldPayAmount) <= 0) return;
    setIsSubmittingGoldPayment(true);
    try {
      await loansApi.addGoldLoanPayment(id, {
        paymentDate: goldPayDate,
        amount: goldPayAmount,
        notes: goldPayNotes.trim() || undefined,
      });
      setIsAddGoldPaymentOpen(false);
      setGoldPayAmount('');
      setGoldPayNotes('');
      await loadLoanData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record gold loan payment.');
    } finally {
      setIsSubmittingGoldPayment(false);
    }
  };

  const handleCalculateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !quoteDate) return;
    setIsCalculatingQuote(true);
    try {
      const res = await loansApi.getGoldLoanLedger(id, quoteDate);
      setQuoteResult(res);
    } catch {
      alert('Failed to calculate payoff quote for date.');
    } finally {
      setIsCalculatingQuote(false);
    }
  };

  const handleUpdateTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !loan) return;
    setIsSavingTerms(true);
    try {
      await loansApi.update(id, {
        name: editName.trim() || undefined,
        placeOrPurpose: editPlace.trim() || undefined,
        comments: editComments.trim() || undefined,
        lender: editLender.trim(),
        interestRate: editRate,
        tenureMonths: Number(editTenure),
        emiType: editEmiType,
        status: editStatus,
      });
      setIsEditLoanOpen(false);
      await loadLoanData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update loan terms.');
    } finally {
      setIsSavingTerms(false);
    }
  };

  const handleDeleteLoan = async () => {
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this loan and its repayment schedule?')) {
      try {
        await loansApi.remove(id);
        navigate('/loans');
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete loan.');
      }
    }
  };

  const openEditInstallment = (inst: RepaymentInstallment) => {
    setEditingInstallment(inst);
    setInstEmi(inst.emiAmount || inst.emi_amount || '');
    setInstPrincipal(inst.principalComponent || inst.principal_component || '');
    setInstInterest(inst.interestComponent || inst.interest_component || '');
    setInstPaid(inst.isPaid ?? inst.is_paid ?? false);
    setInstNotes(inst.notes || '');
  };

  const handleSaveInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editingInstallment) return;
    setIsSavingInstallment(true);
    try {
      await loansApi.updateInstallment(id, editingInstallment.id, {
        emiAmount: instEmi,
        principalComponent: instPrincipal,
        interestComponent: instInterest,
        isPaid: instPaid,
        notes: instNotes,
      });
      setEditingInstallment(null);
      await loadLoanData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update installment.');
    } finally {
      setIsSavingInstallment(false);
    }
  };

  const handleTogglePaid = async (inst: RepaymentInstallment) => {
    if (!id) return;
    const currentPaid = inst.isPaid ?? inst.is_paid ?? false;
    try {
      await loansApi.updateInstallment(id, inst.id, {
        isPaid: !currentPaid,
      });
      await loadLoanData();
    } catch (err: any) {
      alert('Failed to toggle installment status.');
    }
  };

  // Filtered schedule
  const filteredSchedule = useMemo(() => {
    return schedule.filter((inst) => {
      const isPaid = inst.isPaid ?? inst.is_paid ?? false;
      if (filterMode === 'paid') return isPaid;
      if (filterMode === 'unpaid') return !isPaid;
      return true;
    });
  }, [schedule, filterMode]);

  // Accumulated totals across entire schedule
  const scheduleTotals = useMemo(() => {
    let totalEmi = 0;
    let totalPrincipal = 0;
    let totalInterest = 0;

    for (const inst of schedule) {
      totalEmi += Number(inst.emiAmount ?? inst.emi_amount ?? 0);
      totalPrincipal += Number(inst.principalComponent ?? inst.principal_component ?? 0);
      totalInterest += Number(inst.interestComponent ?? inst.interest_component ?? 0);
    }
    return { totalEmi, totalPrincipal, totalInterest };
  }, [schedule]);

  // Accumulated totals across currently filtered rows
  const filteredTotals = useMemo(() => {
    let totalEmi = 0;
    let totalPrincipal = 0;
    let totalInterest = 0;

    for (const inst of filteredSchedule) {
      totalEmi += Number(inst.emiAmount ?? inst.emi_amount ?? 0);
      totalPrincipal += Number(inst.principalComponent ?? inst.principal_component ?? 0);
      totalInterest += Number(inst.interestComponent ?? inst.interest_component ?? 0);
    }
    return { totalEmi, totalPrincipal, totalInterest };
  }, [filteredSchedule]);

  // Jump to specific installment
  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const monthNum = parseInt(jumpMonth, 10);
    if (isNaN(monthNum)) return;
    const el = document.getElementById(`installment-row-${monthNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-cyan-500');
      setTimeout(() => el.classList.remove('ring-2', 'ring-cyan-500'), 2500);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-600 mr-2" />
        <span>Loading loan details & schedule...</span>
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Loan not found</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{error || 'Unknown error occurred.'}</p>
        <button
          onClick={() => navigate('/loans')}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Loans</span>
        </button>
      </div>
    );
  }

  const isGoldLoan = loan.type === 'jewel' || loan.type === 'gold';
  const interestRate = loan.interestRate || loan.interest_rate || '0';
  const emiAmount = loan.emiAmount || loan.emi_amount || '0';
  const tenureMonths = loan.tenureMonths || loan.tenure_months || 0;
  const isDefaulted = loan.status === 'defaulted';
  const discrepancyFlag = loan.discrepancyFlag ?? loan.discrepancy_flag;

  // Discrepancy details parsing
  let discrepancyInfo: any = null;
  if (discrepancyFlag && (loan.discrepancyDetails || loan.discrepancy_details)) {
    try {
      discrepancyInfo = JSON.parse(loan.discrepancyDetails || loan.discrepancy_details || '{}');
    } catch {}
  }

  // Paid stats
  const paidCount = schedule.filter((i) => i.isPaid ?? i.is_paid).length;
  const progressPct = schedule.length > 0 ? Math.round((paidCount / schedule.length) * 100) : 0;
  const lastInstallment = schedule[schedule.length - 1];
  const payoffDate = lastInstallment ? lastInstallment.dueDate || lastInstallment.due_date : loan.startDate || loan.start_date;

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/loans')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to all loans</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsPartPaymentOpen(true)}
            disabled={isDefaulted}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Make Part-Payment</span>
          </button>

          <button
            onClick={() => setIsRateRevisionOpen(true)}
            disabled={isDefaulted}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-sm shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Log Rate Revision</span>
          </button>

          <button
            onClick={() => setIsCalibrateOpen(true)}
            disabled={isDefaulted}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors cursor-pointer shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Sync Statement</span>
          </button>

          <button
            onClick={() => setIsEditLoanOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer shadow-sm"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Terms</span>
          </button>

          <button
            onClick={() => setIsPrepaymentOpen(true)}
            disabled={isDefaulted}
            title={isDefaulted ? 'Prepayment disabled for defaulted loans' : 'Run Prepayment Simulator'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Calculator</span>
          </button>

          <button
            onClick={handleDeleteLoan}
            className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
            title="Delete loan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loan Title & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {(loan as any).name || loan.lender}
            </h1>
            <span className="text-xs uppercase font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {loan.type} loan
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${
                loan.status === 'active'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : loan.status === 'paid_off'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200'
                  : 'bg-rose-50 dark:bg-rose-950 text-rose-600 border border-rose-200'
              }`}
            >
              {loan.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-2 flex-wrap">
            <span>{loan.lender}</span>
            {((loan as any).place_or_purpose || (loan as any).placeOrPurpose) && (
              <>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="font-medium text-slate-600 dark:text-slate-300">{(loan as any).place_or_purpose || (loan as any).placeOrPurpose}</span>
              </>
            )}
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span>Origin: {formatDate(loan.startDate || loan.start_date || '')}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span>Payoff: {formatDate(payoffDate || '')}</span>
          </p>
        </div>

        {/* EMI Reminder Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Auto EMI Queue</span>
          <button
            type="button"
            onClick={async () => {
              if (!id || !loan) return;
              const newVal = !((loan as any).emi_reminders_enabled ?? (loan as any).emiRemindersEnabled ?? true);
              try {
                await loansApi.update(id, { emiRemindersEnabled: newVal });
                await loadLoanData();
              } catch { alert('Failed to update EMI reminder setting.'); }
            }}
            title="Toggle monthly EMI auto-queue in Expenses"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
              ((loan as any).emi_reminders_enabled ?? (loan as any).emiRemindersEnabled ?? true) ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
              ((loan as any).emi_reminders_enabled ?? (loan as any).emiRemindersEnabled ?? true) ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Discrepancy Banner if applicable */}
      {discrepancyFlag && discrepancyInfo && (
        <DiscrepancyBanner
          calculatedEmi={discrepancyInfo.calculatedEmi}
          userEmi={discrepancyInfo.userEmi}
          diffPct={discrepancyInfo.diffPct}
          impliedRate={discrepancyInfo.impliedRate}
        />
      )}

      {/* Defaulted Warning Tooltip Bar */}
      {isDefaulted && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            This loan is currently flagged as <strong>Defaulted</strong>. Prepayment calculations are disabled.
          </span>
        </div>
      )}

      {/* Personal Notes Card */}
      {((loan as any).comments) && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5">
          <FileText className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-0.5">Personal Notes</div>
            <p className="text-xs text-amber-800 dark:text-amber-300">{(loan as any).comments}</p>
          </div>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Current Outstanding
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
            {formatINR(isGoldLoan && goldLedger ? goldLedger.currentOutstandingToday : loan.principal)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Type: <span className="capitalize text-slate-600 dark:text-slate-300 font-semibold">{isGoldLoan ? 'Gold Overdraft' : (loan.interestType || loan.interest_type || 'Reducing')}</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            {isGoldLoan ? 'Monthly Servicing' : 'Monthly EMI'}
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
            {formatINR(emiAmount)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 capitalize">
            {isGoldLoan ? 'Manual payments' : `Mode: ${loan.emiType || loan.emi_type}`}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Overall Interest
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {formatINR(isGoldLoan && goldLedger ? goldLedger.totalInterestCharged : scheduleTotals.totalInterest)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total Lifetime Cost
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Interest Rate
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400">
            {interestRate}% <span className="text-xs font-normal">p.a.</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Compounding: <span className="capitalize font-semibold text-slate-600 dark:text-slate-300">{loan.compoundingFrequency || loan.compounding_frequency || 'Monthly'}</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm col-span-2 md:col-span-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            {isGoldLoan ? 'Payoff Today' : 'Tenure Progress'}
          </div>
          {isGoldLoan && goldLedger ? (
            <>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatINR(goldLedger.payoffQuoteToday)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Full closure today
              </div>
            </>
          ) : (
            <>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                {paidCount} <span className="text-sm font-medium text-slate-400">/ {schedule.length || tenureMonths} mos</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Rate Revisions & Part-Payments Summary Card */}
      {(rateRevisions.length > 0 || prepayments.length > 0) ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Floating Rate Revisions & Part-Payments History</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {rateRevisions.length} revision{rateRevisions.length === 1 ? '' : 's'} • {prepayments.length} part-payment{prepayments.length === 1 ? '' : 's'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Track how RBI repo rate changes and ad-hoc lump sums contracted your tenure.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPartPaymentOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Part Payment</span>
              </button>
              <button
                type="button"
                onClick={() => setIsRateRevisionOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 cursor-pointer"
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>+ Rate Change</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rate Revisions Timeline */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <BadgePercent className="w-3.5 h-3.5 text-cyan-500" />
                <span>Rate Revisions ({rateRevisions.length})</span>
              </div>
              {rateRevisions.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 text-xs text-slate-400 text-center">
                  No rate changes logged yet. Click "+ Rate Change" when your bank alters your interest rate.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {rateRevisions.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                            {rev.oldRate || rev.old_rate}%
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="font-mono font-extrabold text-cyan-600 dark:text-cyan-400">
                            {rev.newRate || rev.new_rate}%
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-750 text-slate-600 dark:text-slate-300">
                            {rev.policy === 'keep_emi' ? 'Fixed EMI' : 'Fixed Tenure'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Effective: {formatDate(rev.effectiveDate || rev.effective_date)}
                          {rev.notes ? ` • ${rev.notes}` : ''}
                        </div>
                      </div>

                      <div className="text-right">
                        {Number(rev.interestSaved || rev.interest_saved) > 0 && (
                          <div className="font-bold text-emerald-600 font-mono text-[11px]">
                            Saved {formatINR(Number(rev.interestSaved || rev.interest_saved))}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 font-mono">
                          Tenure: {rev.newTenureMonths || rev.new_tenure_months} mos
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Part-Payments Log */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>Part-Payments Log ({prepayments.length})</span>
              </div>
              {prepayments.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 text-xs text-slate-400 text-center">
                  No part-payments recorded. Click "+ Part Payment" to log lump sums with broken-period interest.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {prepayments.map((prep) => {
                    const brokenInt = Number(prep.accruedInterest || prep.accrued_interest || 0);
                    return (
                      <div
                        key={prep.id}
                        className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            {formatINR(prep.amount)}
                            {brokenInt > 0 && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal ml-1.5">
                                (+{formatINR(brokenInt)} broken interest)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            Paid on {formatDate(prep.date)} • {prep.mode === 'reduce_tenure' ? 'Reduced Tenure' : 'Reduced EMI'}
                            {prep.notes ? ` • ${prep.notes}` : ''}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-emerald-600 font-mono text-[11px]">
                            Saved {formatINR(Number(prep.interestSaved || prep.interest_saved || 0))}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Outflow: {formatINR(Number(prep.totalPaid || prep.total_paid || prep.amount))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-50/60 via-slate-50 to-teal-50/60 dark:from-cyan-950/20 dark:via-slate-900 dark:to-teal-950/20 border border-cyan-100 dark:border-cyan-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <BadgePercent className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Floating Rate or Part-Payments?
              </span>
              <span className="text-slate-500 dark:text-slate-400 ml-1.5">
                Log RBI repo rate changes (e.g. 8.65% → 7.40%) to auto-recalculate tenure while keeping EMI constant, or record part payments with broken-period interest.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsPartPaymentOpen(true)}
              className="px-3 py-1.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer shadow-xs"
            >
              Make Part-Payment
            </button>
            <button
              onClick={() => setIsRateRevisionOpen(true)}
              className="px-3 py-1.5 rounded-xl font-bold text-white bg-cyan-600 hover:bg-cyan-700 cursor-pointer shadow-xs"
            >
              Log Rate Revision
            </button>
          </div>
        </div>
      )}

      {/* Gold Loan Overdraft & Statement Ledger Card */}
      {isGoldLoan && goldLedger && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-700/60 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Gold Loan Running Balance Overdraft</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                      Bullet Payoff
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Interest accrues daily on outstanding balance and capitalizes on the last day of each month.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddGoldPaymentOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-sm shadow-amber-600/20 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Record Payment</span>
                </button>
              </div>
            </div>

            {/* Smart Tip Alert */}
            {goldLedger.smartTip && (
              <div className="p-3 bg-amber-100/70 dark:bg-amber-950/60 rounded-xl text-xs font-medium text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{goldLedger.smartTip}</span>
              </div>
            )}

            {/* Breakdown cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/60 dark:border-slate-800">
                <div className="text-[10px] font-semibold uppercase text-slate-400">Posted Month-End Bal</div>
                <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
                  {formatINR(goldLedger.postedBalance)}
                </div>
                <div className="text-[10px] text-slate-400">Last capitalized</div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/60 dark:border-slate-800">
                <div className="text-[10px] font-semibold uppercase text-slate-400">Unposted Daily Accrued</div>
                <div className="text-lg font-black font-mono text-rose-600 dark:text-rose-400">
                  {formatINR(goldLedger.accruedInterestUnposted)}
                </div>
                <div className="text-[10px] text-slate-400">Current open month</div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/60 dark:border-slate-800">
                <div className="text-[10px] font-semibold uppercase text-slate-400">Payoff Quote (Today)</div>
                <div className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
                  {formatINR(goldLedger.payoffQuoteToday)}
                </div>
                <div className="text-[10px] text-slate-400">Total to close today</div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/60 dark:border-slate-800">
                <div className="text-[10px] font-semibold uppercase text-slate-400">Compounding Cost</div>
                <div className="text-lg font-black font-mono text-purple-600 dark:text-purple-400">
                  {formatINR(goldLedger.compoundingCost)}
                </div>
                <div className="text-[10px] text-slate-400">Over simple interest</div>
              </div>
            </div>
          </div>

          {/* Running Statement Ledger Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-600" />
                  <span>Statement Ledger (Bank Passbook)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Actual passbook transactions with interest postings, manual payments, and running balance.
                </p>
              </div>

              {/* Payoff Quote Calculator form */}
              <form onSubmit={handleCalculateQuote} className="flex items-center gap-2">
                <input
                  type="date"
                  value={quoteDate}
                  onChange={(e) => setQuoteDate(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={isCalculatingQuote || !quoteDate}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 cursor-pointer"
                >
                  {isCalculatingQuote ? 'Calculating...' : 'Get Payoff Quote'}
                </button>
              </form>
            </div>

            {/* Quote Result display if available */}
            {quoteResult && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-xs flex items-center justify-between">
                <div>
                  Payoff Quote as of <strong>{formatDate(quoteResult.asOfDate)}</strong>:
                  <span className="ml-2 font-mono font-bold text-amber-700 dark:text-amber-300">
                    {formatINR(quoteResult.payoffQuoteToday)}
                  </span>
                  <span className="ml-2 text-slate-400">
                    (Posted: {formatINR(quoteResult.postedBalance)} + Accrued: {formatINR(quoteResult.accruedInterestUnposted)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setQuoteResult(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px]">Date</th>
                    <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px]">Event / Type</th>
                    <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px] text-center">Days</th>
                    <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Debit / Credit</th>
                    <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Running Balance</th>
                    <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px]">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {goldLedger.entries && goldLedger.entries.map((entry: any, idx: number) => {
                    const isPayment = entry.type === 'PAYMENT';
                    const isInterest = entry.type === 'INTEREST_POSTED';

                    return (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <td className="py-2 px-4 font-sans text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {formatDate(entry.date)}
                        </td>
                        <td className="py-2 px-4 font-sans font-medium">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] ${
                              isPayment
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : isInterest
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                            }`}
                          >
                            {entry.type}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-center text-slate-400">
                          {entry.days ? `${entry.days} d` : '-'}
                        </td>
                        <td
                          className={`py-2 px-4 text-right font-bold ${
                            isPayment
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isInterest
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {isPayment ? `-${formatINR(entry.amount)}` : `+${formatINR(entry.amount)}`}
                        </td>
                        <td className="py-2 px-4 text-right font-black text-slate-900 dark:text-white">
                          {formatINR(entry.balanceAfter)}
                        </td>
                        <td className="py-2 px-4 font-sans text-slate-400 text-[11px]">
                          {entry.note || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Repayment Schedule Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Schedule Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-600" />
              <span>Full Amortization Schedule</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Installment-by-installment balance reduction. Click any row to record actual payments or adjust splits.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter Tabs */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({schedule.length})
              </button>
              <button
                onClick={() => setFilterMode('unpaid')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  filterMode === 'unpaid'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Unpaid ({schedule.length - paidCount})
              </button>
              <button
                onClick={() => setFilterMode('paid')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  filterMode === 'paid'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Paid ({paidCount})
              </button>
            </div>

            {/* Jump to Month */}
            <form onSubmit={handleJump} className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                max={schedule.length}
                placeholder="Jump #..."
                value={jumpMonth}
                onChange={(e) => setJumpMonth(e.target.value)}
                className="w-24 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="submit"
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs cursor-pointer"
                title="Jump to row"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="overflow-x-auto max-h-[620px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          <table className="w-full text-left border-collapse text-xs min-w-[760px]">
            <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px] w-12 text-center">#</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Due Date</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Opening Bal</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">EMI</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px] text-right text-emerald-600 dark:text-emerald-400">Principal</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px] text-right text-rose-500">Interest</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Closing Bal</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px] text-center">Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px] text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {filteredSchedule.map((inst) => {
                const instNum = inst.installmentNumber ?? inst.installment_number;
                const isPaid = inst.isPaid ?? inst.is_paid ?? false;
                const isEdited = inst.isManuallyEdited ?? inst.is_manually_edited;
                const dueDate = inst.dueDate || inst.due_date || '';
                const opening = inst.openingBalance || inst.opening_balance || '0';
                const emi = inst.emiAmount || inst.emi_amount || '0';
                const principalPart = inst.principalComponent || inst.principal_component || '0';
                const interestPart = inst.interestComponent || inst.interest_component || '0';
                const closing = inst.closingBalance || inst.closing_balance || '0';

                return (
                  <tr
                    key={inst.id}
                    id={`installment-row-${instNum}`}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                      isPaid ? 'opacity-70 bg-slate-50/50 dark:bg-slate-900/30' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 text-center font-bold text-slate-400">
                      {instNum}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatDate(dueDate)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400">
                      {formatINR(opening)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {formatINR(emi)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatINR(principalPart)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-rose-500 dark:text-rose-400">
                      {formatINR(interestPart)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-700 dark:text-slate-300">
                      {formatINR(closing)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTogglePaid(inst)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-bold cursor-pointer transition-all ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-emerald-50'
                          }`}
                        >
                          <CheckCircle2 className={`w-3 h-3 ${isPaid ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span>{isPaid ? 'Paid' : 'Unpaid'}</span>
                        </button>

                        {isEdited && (
                          <span
                            title="Edited manually — downstream schedule recalibrated"
                            className="p-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px] font-sans font-semibold"
                          >
                            Edited
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center font-sans">
                      <button
                        onClick={() => openEditInstallment(inst)}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center mx-auto p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        title="Edit installment details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100 dark:bg-slate-800 font-mono font-bold border-t-2 border-slate-300 dark:border-slate-700 sticky bottom-0 z-10 shadow-sm">
              <tr>
                <td colSpan={3} className="py-3 px-4 text-right uppercase text-[11px] font-sans font-bold text-slate-700 dark:text-slate-300">
                  {filterMode === 'all' ? 'Accumulated Total:' : `Filtered (${filterMode}) Total:`}
                </td>
                <td className="py-3 px-4 text-right text-slate-900 dark:text-white font-black">
                  {formatINR(filteredTotals.totalEmi)}
                </td>
                <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-black">
                  {formatINR(filteredTotals.totalPrincipal)}
                </td>
                <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400 font-black">
                  {formatINR(filteredTotals.totalInterest)}
                </td>
                <td colSpan={3} className="py-3 px-4 text-xs font-sans font-normal text-slate-400 text-center">
                  {filteredSchedule.length} installment{filteredSchedule.length === 1 ? '' : 's'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Edit Terms Slide Drawer */}
      <SlideDrawer
        isOpen={isEditLoanOpen}
        onClose={() => setIsEditLoanOpen(false)}
        title="Edit Loan Terms"
      >
        <form onSubmit={handleUpdateTerms} className="space-y-4">
          <p className="text-xs text-slate-500">
            Modifying principal, interest rate, or tenure will automatically regenerate the future repayment schedule.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Loan Name / Label
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Home Loan Top Up"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Place / Purpose
              </label>
              <input
                type="text"
                value={editPlace}
                onChange={(e) => setEditPlace(e.target.value)}
                placeholder="e.g. Chennai Home"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Personal Notes
            </label>
            <textarea
              rows={2}
              value={editComments}
              onChange={(e) => setEditComments(e.target.value)}
              placeholder="Any notes about this loan..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lender Name
            </label>
            <input
              type="text"
              required
              value={editLender}
              onChange={(e) => setEditLender(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Interest Rate (% p.a.)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={editRate}
                onChange={(e) => setEditRate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tenure (Months)
              </label>
              <input
                type="number"
                required
                min="1"
                value={editTenure}
                onChange={(e) => setEditTenure(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Type
              </label>
              <select
                value={editEmiType}
                onChange={(e: any) => setEditEmiType(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="fixed">Fixed EMI</option>
                <option value="flexible">Flexible EMI</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={editStatus}
                onChange={(e: any) => setEditStatus(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="paid_off">Closed / Paid Off</option>
                <option value="defaulted">Defaulted</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditLoanOpen(false)}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingTerms}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 flex items-center gap-2 cursor-pointer"
            >
              {isSavingTerms && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save & Regenerate</span>
            </button>
          </div>
        </form>
      </SlideDrawer>

      {/* Edit Single Installment Slide Drawer */}
      <SlideDrawer
        isOpen={Boolean(editingInstallment)}
        onClose={() => setEditingInstallment(null)}
        title={`Edit Installment #${editingInstallment?.installmentNumber ?? editingInstallment?.installment_number}`}
      >
        <form onSubmit={handleSaveInstallment} className="space-y-4">
          <p className="text-xs text-slate-500">
            Adjusting the principal or EMI of this row marks it as manually edited and recalculates subsequent balances down to zero.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              EMI Amount (₹)
            </label>
            <input
              type="number"
              step="any"
              value={instEmi}
              onChange={(e) => setInstEmi(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Principal Component (₹)
              </label>
              <input
                type="number"
                step="any"
                value={instPrincipal}
                onChange={(e) => setInstPrincipal(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Interest Component (₹)
              </label>
              <input
                type="number"
                step="any"
                value={instInterest}
                onChange={(e) => setInstInterest(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-rose-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="inst-paid-check"
              checked={instPaid}
              onChange={(e) => setInstPaid(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
            />
            <label htmlFor="inst-paid-check" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Mark this installment as paid
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Manual Edit Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Bank debited extra interest / revised EMI"
              value={instNotes}
              onChange={(e) => setInstNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEditingInstallment(null)}
              className="px-4 py-2 text-sm text-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingInstallment}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 flex items-center gap-2 cursor-pointer"
            >
              {isSavingInstallment && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save & Ripple Update</span>
            </button>
          </div>
        </form>
      </SlideDrawer>

      {/* Prepayment Calculator Modal */}
      {loan && (
        <PrepaymentCalculatorModal
          isOpen={isPrepaymentOpen}
          onClose={() => setIsPrepaymentOpen(false)}
          loan={loan}
          onPrepaymentApplied={loadLoanData}
        />
      )}

      {/* Rate Revision Modal */}
      {loan && (
        <RateRevisionModal
          isOpen={isRateRevisionOpen}
          onClose={() => setIsRateRevisionOpen(false)}
          loanId={id!}
          currentRate={interestRate}
          currentEmi={emiAmount}
          onSuccess={loadLoanData}
        />
      )}

      {/* Part-Payment Modal */}
      {loan && (
        <PartPaymentModal
          isOpen={isPartPaymentOpen}
          onClose={() => setIsPartPaymentOpen(false)}
          loanId={id!}
          currentRate={interestRate}
          currentEmi={emiAmount}
          onSuccess={loadLoanData}
        />
      )}

      {/* Calibrate / Sync Statement Modal */}
      {loan && (
        <CalibrateLoanModal
          isOpen={isCalibrateOpen}
          onClose={() => setIsCalibrateOpen(false)}
          loanId={id!}
          defaultPrincipal={loan.principal}
          defaultRate={interestRate}
          defaultTenure={schedule.length > 0 ? schedule.filter(i => !(i.isPaid ?? i.is_paid)).length : tenureMonths}
          defaultEmi={emiAmount}
          onSuccess={loadLoanData}
        />
      )}

      {/* Record Gold Loan Payment Modal */}
      {isAddGoldPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-600" />
                <span>Record Gold Loan Payment</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddGoldPaymentOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddGoldPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={goldPayDate}
                  onChange={(e) => setGoldPayDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="1"
                  value={goldPayAmount}
                  onChange={(e) => setGoldPayAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Payments take effect from their exact date, segmenting the month and immediately reducing interest.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Reference
                </label>
                <input
                  type="text"
                  value={goldPayNotes}
                  onChange={(e) => setGoldPayNotes(e.target.value)}
                  placeholder="e.g. Part payment via Net Banking"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddGoldPaymentOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGoldPayment}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-sm cursor-pointer"
                >
                  {isSubmittingGoldPayment ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
