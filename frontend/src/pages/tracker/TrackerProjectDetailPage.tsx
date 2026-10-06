import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { trackerApi } from '../../api/endpoints/tracker.api';
import {
  TrackerProject,
  TrackerExpense,
  TrackerPhase,
  TrackerExpenseType,
  TrackerTagItem,
  TrackerUnit,
  TrackerAnalytics,
} from '../../types';
import { formatINR } from '../../utils/currency';
import { SlideDrawer } from '../../components/ui/SlideDrawer';
import {
  Building2,
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Calendar,
  Tag,
  Layers,
  Settings,
  BarChart3,
  Edit2,
  Trash2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  FileSpreadsheet,
  Maximize2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  DollarSign,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Package,
  Boxes,
  HelpCircle,
  Palette,
  Hash,
  Hammer,
  Scale,
  TrendingUp,
  Lightbulb,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import clsx from 'clsx';

export const TrackerProjectDetailPage: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'expenses' | 'analytics' | 'settings'>('expenses');

  // Core Data
  const [project, setProject] = useState<TrackerProject | null>(null);
  const [units, setUnits] = useState<TrackerUnit[]>([]);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Tab 1: Expenses List & Filtering State
  const [expenses, setExpenses] = useState<TrackerExpense[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 1,
  });
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Tab 2: Analytics State
  const [analytics, setAnalytics] = useState<TrackerAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [includeLabour, setIncludeLabour] = useState(true);

  // Memoized calculations for rich analytics, numeric Recharts bindings, and smart recommendations
  const analyticsDerived = useMemo(() => {
    if (!analytics) return null;

    const totalSpendNum = parseFloat(analytics.summary.totalSpend) || 0;

    // 1. Tag Donut Chart Data (strictly numeric values so Recharts renders arcs!)
    const tagChartData = (analytics.percentageByTag || [])
      .map((item) => ({
        ...item,
        value: parseFloat(item.totalCost) || 0,
        numericPercentage: parseFloat(item.percentage) || 0,
      }))
      .filter((item) => item.value > 0);

    // 2. Identify Labor vs Material spend
    const laborTags = tagChartData.filter((t) => t.tagName.toLowerCase().includes('labour'));
    const laborSpend = laborTags.reduce((sum, t) => sum + t.value, 0);
    const materialSpend = Math.max(0, totalSpendNum - (includeLabour ? laborSpend : 0));
    const laborSharePct = totalSpendNum > 0 ? ((laborSpend / totalSpendNum) * 100).toFixed(1) : '0';
    const materialSharePct = totalSpendNum > 0 ? ((materialSpend / totalSpendNum) * 100).toFixed(1) : '100';

    // 3. Top 5 Material Cost Drivers (excluding labor)
    const topMaterials = tagChartData
      .filter((t) => !t.tagName.toLowerCase().includes('labour'))
      .slice(0, 5);
    const top3MaterialsTotal = topMaterials.slice(0, 3).reduce((sum, t) => sum + t.value, 0);
    const top3MaterialPct = materialSpend > 0 ? ((top3MaterialsTotal / materialSpend) * 100).toFixed(1) : '0';
    const top3Names = topMaterials.slice(0, 3).map((t) => t.tagName).join(', ') || 'Core Materials';

    // 4. Built-up Cost Industry Benchmark
    const sqFtRate = analytics.summary.pricePerSqFt ? parseFloat(analytics.summary.pricePerSqFt) : 0;
    let benchmarkStatus = 'Optimal Benchmark';
    let benchmarkBadgeBg = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    let benchmarkText = 'Standard commercial/residential RCC benchmark range in India is ₹2,200 – ₹2,900 / sq ft.';
    if (sqFtRate > 2900) {
      benchmarkStatus = 'Premium Grade';
      benchmarkBadgeBg = 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      benchmarkText = 'Above standard benchmark (> ₹2,900/sq ft) reflecting superior material specs or specialized finishes.';
    } else if (sqFtRate < 2100 && sqFtRate > 0) {
      benchmarkStatus = 'High Cost Efficiency';
      benchmarkBadgeBg = 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      benchmarkText = 'Below ₹2,100/sq ft reflecting disciplined direct sourcing and bulk procurement discounts.';
    }

    // 5. Total unique materials count
    const uniqueMaterialsCount = analytics.quantityByExpense?.length || 0;

    return {
      totalSpendNum,
      tagChartData,
      laborSpend,
      materialSpend,
      laborSharePct,
      materialSharePct,
      topMaterials,
      top3MaterialPct,
      top3Names,
      sqFtRate,
      benchmarkStatus,
      benchmarkBadgeBg,
      benchmarkText,
      uniqueMaterialsCount,
    };
  }, [analytics, includeLabour]);

  // Slide-over Drawer for Add/Edit Expense
  const [isExpenseDrawerOpen, setIsExpenseDrawerOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<TrackerExpense | null>(null);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [expenseFormError, setExpenseFormError] = useState<string | null>(null);

  // Expense Form Fields
  const [formPurchaseDate, setFormPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formPhaseId, setFormPhaseId] = useState('');
  const [formTypeId, setFormTypeId] = useState('');
  const [formTagId, setFormTagId] = useState('');
  const [formProductName, setFormProductName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formQuantity, setFormQuantity] = useState('1');
  const [formUnitId, setFormUnitId] = useState('');
  const [formPricePerQty, setFormPricePerQty] = useState('');
  const [formTotalCost, setFormTotalCost] = useState('');
  const [formIsException, setFormIsException] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [isTotalManuallyOverridden, setIsTotalManuallyOverridden] = useState(false);

  // Delete Expense Confirmation Modal
  const [expenseToDelete, setExpenseToDelete] = useState<TrackerExpense | null>(null);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);

  // Tab 3: Settings Form State
  const [settingsName, setSettingsName] = useState('');
  const [settingsCode, setSettingsCode] = useState('');
  const [settingsTotalArea, setSettingsTotalArea] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);

  // Lookup Management Modals / Inputs
  const [newPhaseName, setNewPhaseName] = useState('');
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [isAddingType, setIsAddingType] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#0284c7');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [isAddingUnit, setIsAddingUnit] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Project and Units on Mount
  const loadProjectAndLookups = async () => {
    if (!projectId) return;
    setIsLoadingProject(true);
    setPageError(null);
    try {
      const [projData, unitsData] = await Promise.all([
        trackerApi.getProject(projectId),
        trackerApi.getUnits(),
      ]);
      setProject(projData);
      setUnits(unitsData || []);

      // Init settings form values
      setSettingsName(projData.name || '');
      setSettingsCode(projData.code || '');
      setSettingsTotalArea(projData.total_area_sqft ? String(projData.total_area_sqft) : '');
      setSettingsDescription(projData.description || '');
    } catch (err: any) {
      setPageError(err?.response?.data?.message || 'Failed to load project details.');
    } finally {
      setIsLoadingProject(false);
    }
  };

  useEffect(() => {
    loadProjectAndLookups();
  }, [projectId]);

  // Load Expenses
  const loadExpenses = async (page = pagination.page) => {
    if (!projectId) return;
    setIsLoadingExpenses(true);
    try {
      const res = await trackerApi.getExpenses(projectId, {
        phaseId: selectedPhase !== 'all' ? selectedPhase : undefined,
        tagId: selectedTag !== 'all' ? selectedTag : undefined,
        typeId: selectedType !== 'all' ? selectedType : undefined,
        search: debouncedSearch || undefined,
        page,
        limit: pagination.limit,
      });
      setExpenses(res.expenses || []);
      setPagination(res.pagination);
    } catch (err: any) {
      console.error('Failed to load expenses', err);
    } finally {
      setIsLoadingExpenses(false);
    }
  };

  useEffect(() => {
    if (projectId && project) {
      loadExpenses(1);
    }
  }, [projectId, project?.id, selectedPhase, selectedTag, selectedType, debouncedSearch, pagination.limit]);

  // Load Analytics
  const loadAnalytics = async () => {
    if (!projectId) return;
    setIsLoadingAnalytics(true);
    try {
      const data = await trackerApi.getAnalytics(projectId, {
        includeLabour,
      });
      setAnalytics(data);
    } catch (err: any) {
      console.error('Failed to load analytics', err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (projectId && project) {
      loadAnalytics();
    }
  }, [projectId, project?.id, includeLabour]);

  // Auto-calculate Total Cost when Qty or Price changes unless manually overridden
  const calculateTotal = (qtyStr: string, priceStr: string) => {
    const q = parseFloat(qtyStr);
    const p = parseFloat(priceStr);
    if (!isNaN(q) && !isNaN(p) && q >= 0 && p >= 0) {
      return (q * p).toFixed(2);
    }
    return '';
  };

  const handleQtyChange = (val: string) => {
    setFormQuantity(val);
    if (!isTotalManuallyOverridden) {
      const calculated = calculateTotal(val, formPricePerQty);
      if (calculated) setFormTotalCost(calculated);
    }
  };

  const handlePriceChange = (val: string) => {
    setFormPricePerQty(val);
    if (!isTotalManuallyOverridden) {
      const calculated = calculateTotal(formQuantity, val);
      if (calculated) setFormTotalCost(calculated);
    }
  };

  // Open Drawer for Add
  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setFormPurchaseDate(new Date().toISOString().split('T')[0]);
    setFormPhaseId(project?.phases?.[0]?.id || '');
    setFormTypeId(project?.types?.[0]?.id || '');
    setFormTagId(project?.tags?.[0]?.id || '');
    setFormProductName('');
    setFormBrand('');
    setFormQuantity('1');
    setFormUnitId(units[0]?.id || '');
    setFormPricePerQty('');
    setFormTotalCost('');
    setFormIsException(false);
    setFormDescription('');
    setIsTotalManuallyOverridden(false);
    setExpenseFormError(null);
    setIsExpenseDrawerOpen(true);
  };

  // Open Drawer for Edit
  const handleOpenEditExpense = (item: TrackerExpense) => {
    setEditingExpense(item);
    setFormPurchaseDate(item.purchase_date ? item.purchase_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setFormPhaseId(item.project_phase_id || '');
    setFormTypeId(item.expense_type_id || '');
    setFormTagId(item.tag_item_id || '');
    setFormProductName(item.product_name || '');
    setFormBrand(item.brand || '');
    setFormQuantity(String(item.quantity));
    setFormUnitId(item.unit_id || '');
    setFormPricePerQty(String(item.price_per_qty));
    setFormTotalCost(String(item.total_cost));
    setFormIsException(Boolean(item.is_exception));
    setFormDescription(item.description || '');
    setIsTotalManuallyOverridden(true);
    setExpenseFormError(null);
    setIsExpenseDrawerOpen(true);
  };

  // Save Expense (Create or Update)
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    if (!formQuantity || parseFloat(formQuantity) <= 0) {
      setExpenseFormError('Please enter a valid quantity greater than 0.');
      return;
    }
    if (!formPricePerQty || parseFloat(formPricePerQty) < 0) {
      setExpenseFormError('Please enter a valid rate / price per unit.');
      return;
    }

    const finalTotal = formTotalCost ? parseFloat(formTotalCost) : parseFloat(formQuantity) * parseFloat(formPricePerQty);

    setIsSavingExpense(true);
    setExpenseFormError(null);

    try {
      const payload = {
        purchaseDate: formPurchaseDate,
        projectPhaseId: formPhaseId || undefined,
        expenseTypeId: formTypeId || undefined,
        tagItemId: formTagId || undefined,
        productName: formProductName.trim() || undefined,
        brand: formBrand.trim() || undefined,
        quantity: parseFloat(formQuantity),
        pricePerQty: parseFloat(formPricePerQty),
        totalCost: finalTotal,
        unitId: formUnitId || undefined,
        isException: formIsException,
        description: formDescription.trim() || undefined,
      };

      if (editingExpense) {
        await trackerApi.updateExpense(editingExpense.id, payload);
      } else {
        await trackerApi.createExpense(projectId, payload);
      }

      setIsExpenseDrawerOpen(false);
      // Reload both list and analytics
      await Promise.all([loadExpenses(pagination.page), loadAnalytics(), loadProjectAndLookups()]);
    } catch (err: any) {
      setExpenseFormError(err?.response?.data?.message || 'Failed to save expense entry.');
    } finally {
      setIsSavingExpense(false);
    }
  };

  // Delete Expense
  const handleConfirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setIsDeletingExpense(true);
    try {
      await trackerApi.deleteExpense(expenseToDelete.id);
      setExpenseToDelete(null);
      await Promise.all([loadExpenses(pagination.page), loadAnalytics(), loadProjectAndLookups()]);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete expense entry.');
    } finally {
      setIsDeletingExpense(false);
    }
  };

  // Save Project Settings
  const handleSaveProjectSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !settingsName.trim()) return;

    setIsSavingSettings(true);
    setSettingsSuccessMsg(null);
    try {
      const updated = await trackerApi.updateProject(projectId, {
        name: settingsName.trim(),
        code: settingsCode.trim() || undefined,
        totalAreaSqFt: settingsTotalArea ? parseFloat(settingsTotalArea) : undefined,
        description: settingsDescription.trim() || undefined,
      });
      setProject(updated);
      setSettingsSuccessMsg('Project settings saved successfully.');
      setTimeout(() => setSettingsSuccessMsg(null), 3500);
      loadAnalytics();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update project settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Manage Lookups (Add Phase, Type, Tag, Unit)
  const handleAddPhase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !newPhaseName.trim()) return;
    setIsAddingPhase(true);
    try {
      await trackerApi.createPhase(projectId, { name: newPhaseName.trim() });
      setNewPhaseName('');
      await loadProjectAndLookups();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add phase');
    } finally {
      setIsAddingPhase(false);
    }
  };

  const handleDeletePhase = async (phaseId: string) => {
    if (!projectId || !confirm('Are you sure you want to delete this phase?')) return;
    try {
      await trackerApi.deletePhase(projectId, phaseId);
      await loadProjectAndLookups();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete phase');
    }
  };

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !newTypeName.trim()) return;
    setIsAddingType(true);
    try {
      await trackerApi.createType(projectId, { name: newTypeName.trim() });
      setNewTypeName('');
      await loadProjectAndLookups();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add expense type');
    } finally {
      setIsAddingType(false);
    }
  };

  const handleDeleteType = async (typeId: string) => {
    if (!projectId || !confirm('Are you sure you want to delete this type?')) return;
    try {
      await trackerApi.deleteType(projectId, typeId);
      await loadProjectAndLookups();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete type');
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !newTagName.trim()) return;
    setIsAddingTag(true);
    try {
      await trackerApi.createTag(projectId, {
        name: newTagName.trim(),
        hexColor: newTagColor,
      });
      setNewTagName('');
      await loadProjectAndLookups();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add tag');
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!projectId || !confirm('Are you sure you want to delete this tag?')) return;
    try {
      await trackerApi.deleteTag(projectId, tagId);
      await loadProjectAndLookups();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete tag');
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;
    setIsAddingUnit(true);
    try {
      await trackerApi.createUnit({ name: newUnitName.trim() });
      setNewUnitName('');
      const updatedUnits = await trackerApi.getUnits();
      setUnits(updatedUnits);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add unit');
    } finally {
      setIsAddingUnit(false);
    }
  };

  // Compute dynamic KPI metrics
  const totalExpenditure = project?.totalSpend || analytics?.summary.totalSpend || '0';
  const totalItemsCount = project?.itemsCount || analytics?.summary.itemsCount || 0;
  const areaSqFt = project?.total_area_sqft ? parseFloat(String(project.total_area_sqft)) : null;
  const pricePerSqFt = areaSqFt && areaSqFt > 0 ? (parseFloat(totalExpenditure) / areaSqFt).toFixed(2) : null;
  const avgCostPerItem = totalItemsCount > 0 ? (parseFloat(totalExpenditure) / totalItemsCount).toFixed(2) : '0';

  // Format dates
  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '—';
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

  if (isLoadingProject) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">Loading project workspace...</p>
      </div>
    );
  }

  if (pageError || !project) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">Unable to load project</h2>
          <p className="text-sm text-red-600 dark:text-red-300 mt-1">{pageError || 'Project not found.'}</p>
          <button
            onClick={() => navigate('/tracker')}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition"
          >
            Return to Tracker Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <button
            onClick={() => navigate('/tracker')}
            className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Back to Projects"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{project.name}</h1>
              {project.code && (
                <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                  {project.code}
                </span>
              )}
              {areaSqFt && (
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1">
                  <Maximize2 className="w-3 h-3 text-slate-500" />
                  {areaSqFt.toLocaleString('en-IN')} sq ft
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                {project.description}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              loadExpenses(pagination.page);
              loadAnalytics();
            }}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:bg-slate-50 transition"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenAddExpense}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white text-sm font-medium rounded-lg shadow hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Expenditure */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Expenditure
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {formatINR(totalExpenditure)}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Accumulated project spend
            </p>
          </div>
        </div>

        {/* Dynamic Unit KPI: Price per Sq Ft OR Avg Cost per Entry */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {pricePerSqFt ? 'Price per Sq Ft' : 'Avg Cost / Entry'}
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Maximize2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {pricePerSqFt ? `${formatINR(pricePerSqFt)} / sq ft` : formatINR(avgCostPerItem)}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {pricePerSqFt
                ? `Across ${areaSqFt?.toLocaleString('en-IN')} sq ft total area`
                : `Avg per logged procurement entry`}
            </p>
          </div>
        </div>

        {/* Dominant / Active Phase */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Dominant Phase
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
              {analytics?.summary.dominantPhase || project.phases?.[0]?.name || 'N/A'}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Highest share of material & labor
            </p>
          </div>
        </div>

        {/* Total Procurement Items */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Procurement Entries
            </span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {totalItemsCount.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Individual transactions tracked
            </p>
          </div>
        </div>
      </div>

      {/* Workspace Tabs Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-6">
        <button
          onClick={() => setActiveTab('expenses')}
          className={clsx(
            'flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition -mb-px',
            activeTab === 'expenses'
              ? 'border-primary text-primary dark:text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          )}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Expenses Log</span>
          <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-xs font-medium">
            {pagination.total || expenses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={clsx(
            'flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition -mb-px',
            activeTab === 'analytics'
              ? 'border-primary text-primary dark:text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          )}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Reports & Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={clsx(
            'flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition -mb-px',
            activeTab === 'settings'
              ? 'border-primary text-primary dark:text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          )}
        >
          <Settings className="w-4 h-4" />
          <span>Configuration & Lookups</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: EXPENSES LOG                                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search product, brand, type, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Phase Filter */}
              <select
                value={selectedPhase}
                onChange={(e) => setSelectedPhase(e.target.value)}
                className="px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Phases</option>
                {project.phases?.map((p) => (
                  <option key={p.id} value={p.id}>
                    Phase: {p.name}
                  </option>
                ))}
              </select>

              {/* Tag Filter */}
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Tags</option>
                {project.tags?.map((t) => (
                  <option key={t.id} value={t.id}>
                    Tag: {t.name}
                  </option>
                ))}
              </select>

              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Types</option>
                {project.types?.map((t) => (
                  <option key={t.id} value={t.id}>
                    Type: {t.name}
                  </option>
                ))}
              </select>

              {/* Reset Filters */}
              {(selectedPhase !== 'all' || selectedTag !== 'all' || selectedType !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedPhase('all');
                    setSelectedTag('all');
                    setSelectedType('all');
                    setSearchQuery('');
                  }}
                  className="px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 sm:px-4">Date</th>
                    <th className="py-3 px-3 sm:px-4">Type & Material</th>
                    <th className="py-3 px-3 sm:px-4">Phase</th>
                    <th className="py-3 px-3 sm:px-4">Tag</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Quantity</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Rate</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Total Cost</th>
                    <th className="py-3 px-3 sm:px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoadingExpenses ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                        Loading expenses...
                      </td>
                    </tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="font-medium text-slate-600 dark:text-slate-300">No expenses found</p>
                        <p className="text-xs text-slate-400 mt-0.5">Try altering your filters or add a new entry.</p>
                      </td>
                    </tr>
                  ) : (
                    expenses.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group"
                      >
                        {/* Date */}
                        <td className="py-3 px-3 sm:px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {formatDateDisplay(item.purchase_date)}
                          {item.is_exception && (
                            <span
                              className="ml-1.5 inline-flex items-center px-1.5 py-0.2 text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 rounded"
                              title="Marked as exception"
                            >
                              Exception
                            </span>
                          )}
                        </td>

                        {/* Type & Material / Product */}
                        <td className="py-3 px-3 sm:px-4">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {item.product_name || item.expense_type?.name || 'Material Item'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                            {item.expense_type?.name && (
                              <span className="font-medium text-slate-600 dark:text-slate-300">
                                {item.expense_type.name}
                              </span>
                            )}
                            {item.brand && (
                              <span className="text-slate-400">
                                • {item.brand}
                              </span>
                            )}
                            {item.description && (
                              <span className="text-slate-400 italic truncate max-w-[200px]" title={item.description}>
                                • {item.description}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Phase */}
                        <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                          {item.phase ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {item.phase.name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>

                        {/* Tag with color badge */}
                        <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                          {item.tag_item ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: item.tag_item.hex_color ? `${item.tag_item.hex_color}1A` : '#0284c71A',
                                color: item.tag_item.hex_color || '#0284c7',
                              }}
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: item.tag_item.hex_color || '#0284c7' }}
                              />
                              {item.tag_item.name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>

                        {/* Quantity & Unit */}
                        <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap text-slate-700 dark:text-slate-300">
                          <span className="font-medium">{item.quantity}</span>{' '}
                          <span className="text-xs text-slate-400">{item.unit?.name || ''}</span>
                        </td>

                        {/* Rate / Price per unit */}
                        <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {formatINR(item.price_per_qty)}
                        </td>

                        {/* Total Cost */}
                        <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap font-bold text-slate-900 dark:text-white">
                          {formatINR(item.total_cost)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditExpense(item)}
                              className="p-1.5 text-slate-400 hover:text-primary rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Edit Expense"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setExpenseToDelete(item)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm text-slate-500">
                <div>
                  Showing {expenses.length} of {pagination.total} entries
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={pagination.page <= 1 || isLoadingExpenses}
                    onClick={() => loadExpenses(pagination.page - 1)}
                    className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    disabled={pagination.page >= pagination.totalPages || isLoadingExpenses}
                    onClick={() => loadExpenses(pagination.page + 1)}
                    className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: REPORTS & ANALYTICS                                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Controls & Filter Banner */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Construction & Procurement Analytics
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Visual expenditure breakdowns by phase, material tags, and raw item quantities.
              </p>
            </div>

            {/* Labour Cost Toggle Switch */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/70 p-2.5 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Include Labour Costs:
              </div>
              <button
                type="button"
                onClick={() => setIncludeLabour(!includeLabour)}
                className={clsx(
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  includeLabour ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
                )}
                role="switch"
                aria-checked={includeLabour}
              >
                <span
                  className={clsx(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    includeLabour ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {includeLabour ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>

          {isLoadingAnalytics ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
              Computing analytics distribution...
            </div>
          ) : analytics ? (
            <>
              {/* 1. Smart Construction Suggestions & Engineering Insights Banner */}
              <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-teal-500/10 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-teal-950/30 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/50 dark:border-blue-800/40 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        Construction Analytics & Engineering Insights
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Automated auditing of labor absorption, built-up sq ft rate benchmarks, and material concentration.
                      </p>
                    </div>
                  </div>
                  <span className="self-start sm:self-auto px-2.5 py-1 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    Live Project Audit
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Insight 1: Labor vs Material */}
                  <div className="bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-xl border border-blue-100 dark:border-slate-800 backdrop-blur-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        <Hammer className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Labor vs Material Share</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Labour wages absorb <strong className="text-amber-600 dark:text-amber-400">{analyticsDerived?.laborSharePct}%</strong> ({formatINR(analyticsDerived?.laborSpend)}) of expenditure. Pure material procurement accounts for <strong className="text-blue-600 dark:text-blue-400">{analyticsDerived?.materialSharePct}%</strong> ({formatINR(analyticsDerived?.materialSpend)}).
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                      💡 Tip: Toggle "Include Labour Costs" OFF to inspect bulk material rates without labor distortion.
                    </div>
                  </div>

                  {/* Insight 2: Benchmark Tracking */}
                  <div className="bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-xl border border-blue-100 dark:border-slate-800 backdrop-blur-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        <Scale className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Built-up Cost Benchmark</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {analyticsDerived?.sqFtRate ? (
                          <>
                            Tracking at <strong className="text-emerald-600 dark:text-emerald-400">{formatINR(analyticsDerived.sqFtRate)} / sq ft</strong>. {analyticsDerived.benchmarkText}
                          </>
                        ) : (
                          <>Average spend per procurement transaction is <strong>{formatINR(analytics.summary.avgCostPerItem)}</strong>.</>
                        )}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border', analyticsDerived?.benchmarkBadgeBg)}>
                        {analyticsDerived?.benchmarkStatus}
                      </span>
                    </div>
                  </div>

                  {/* Insight 3: Core Material Drivers */}
                  <div className="bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-xl border border-blue-100 dark:border-slate-800 backdrop-blur-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        <TrendingUp className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span>Primary Material Drivers</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Top 3 categories (<strong className="text-slate-900 dark:text-white">{analyticsDerived?.top3Names}</strong>) constitute <strong className="text-indigo-600 dark:text-indigo-400">{analyticsDerived?.top3MaterialPct}%</strong> of total material procurement.
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                      📌 Concentrated volume in structural core (Steel & Cement).
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Expanded High-Value KPI Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-3.5">
                {/* Card 1: Analyzed Net Spend */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-400">Analyzed Spend</div>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {formatINR(analytics.summary.totalSpend)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {includeLabour ? 'Includes labour wages' : 'Pure materials only'}
                  </div>
                </div>

                {/* Card 2: Unit Cost Metric */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-400">Unit Cost Metric</div>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {analytics.summary.pricePerSqFt ? `${formatINR(analytics.summary.pricePerSqFt)} / sq ft` : formatINR(analytics.summary.avgCostPerItem)}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    {analyticsDerived?.benchmarkStatus || 'Standard'}
                  </div>
                </div>

                {/* Card 3: Material vs Labor Split Progress */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-400">Material : Labor</div>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {analyticsDerived?.materialSharePct}% : {analyticsDerived?.laborSharePct}%
                  </div>
                  <div className="w-full bg-amber-200 dark:bg-amber-950/60 rounded-full h-2 mt-1.5 overflow-hidden flex">
                    <div style={{ width: `${analyticsDerived?.materialSharePct}%` }} className="bg-blue-600 h-full" title="Materials" />
                    <div style={{ width: `${analyticsDerived?.laborSharePct}%` }} className="bg-amber-500 h-full" title="Labour" />
                  </div>
                </div>

                {/* Card 4: Top Phase Share */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-400">Dominant Phase</div>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1 truncate">
                    {analytics.summary.dominantPhase}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {analytics.priceByPhase[0]?.percentage || '0'}% of analyzed spend
                  </div>
                </div>

                {/* Card 5: Procurement Items & Materials */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-400">Tracked Catalog</div>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {analytics.summary.itemsCount} Entries
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {analyticsDerived?.uniqueMaterialsCount || 0} unique material types
                  </div>
                </div>
              </div>

              {/* 3. Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Stacked Bar Chart: Phase Breakdown */}
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Expenditure by Construction Phase
                    </h3>
                    <span className="text-xs text-slate-400">
                      {analytics.priceByPhase.length} Milestones
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    Horizontal breakdown of total spend across project milestones (INR).
                  </p>
                  <div className="h-80 w-full">
                    {analytics.priceByPhase.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.priceByPhase}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis
                            type="number"
                            tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis
                            type="category"
                            dataKey="phaseName"
                            tick={{ fontSize: 11 }}
                            width={90}
                          />
                          <Tooltip
                            formatter={(value: any) => [formatINR(value), 'Spend']}
                            labelFormatter={(label) => `Phase: ${label}`}
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              color: '#fff',
                              borderRadius: '8px',
                              border: 'none',
                              fontSize: '12px',
                            }}
                          />
                          <Bar dataKey="totalCost" fill="#0284c7" radius={[0, 4, 4, 0]}>
                            {analytics.priceByPhase.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  index % 4 === 0
                                    ? '#0284c7'
                                    : index % 4 === 1
                                    ? '#6366f1'
                                    : index % 4 === 2
                                    ? '#0d9488'
                                    : '#f59e0b'
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No phase data available
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Donut Chart: Percentage of Expense by Tag (Fixed Numeric Binding + Center Label + Tag Chips) */}
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Expense Distribution by Tags
                    </h3>
                    <span className="text-xs text-slate-400">
                      {analyticsDerived?.tagChartData.length || 0} Categories
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">
                    Proportional share of budget absorbed by steel, cement, labour, plumbing, etc.
                  </p>
                  <div className="h-64 w-full relative">
                    {analyticsDerived && analyticsDerived.tagChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsDerived.tagChartData}
                            dataKey="value"
                            nameKey="tagName"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={2}
                          >
                            {analyticsDerived.tagChartData.map((entry, index) => (
                              <Cell
                                key={`tag-cell-${index}`}
                                fill={entry.hexColor || '#0ea5e9'}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any, name: any, item: any) => [
                              `${formatINR(value)} (${item.payload.percentage}%)`,
                              name,
                            ]}
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              color: '#fff',
                              borderRadius: '8px',
                              border: '1px solid #334155',
                              fontSize: '12px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No tag data available
                      </div>
                    )}
                    {/* Donut Center Display */}
                    {analyticsDerived && analyticsDerived.tagChartData.length > 0 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Total</span>
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                          {formatINR(analytics.summary.totalSpend)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Category Tag Chips with Color Dots & Percentages */}
                  <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {analyticsDerived?.tagChartData.map((t) => (
                      <span
                        key={t.tagId}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: t.hexColor || '#0ea5e9' }}
                        />
                        <span className="text-slate-700 dark:text-slate-300">{t.tagName}</span>
                        <span className="text-slate-400 text-[10px] font-semibold">({t.percentage}%)</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Construction Phases Milestone Breakdown Cards */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      Milestone Phase Cost Absorption
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Progressive expenditure across physical execution phases and labour allocations.
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {analytics.priceByPhase.length} Active Phases
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {analytics.priceByPhase.map((p) => (
                    <div
                      key={p.phaseId}
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {p.phaseName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                          {p.percentage}%
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-base font-extrabold text-slate-900 dark:text-white">
                          {formatINR(p.totalCost)}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {p.count} entries
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, parseFloat(p.percentage))}%` }}
                          className="bg-primary h-full rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Top 5 Material Drivers Highlight */}
              {analyticsDerived && analyticsDerived.topMaterials.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        Primary Material Cost Drivers (Excl. Labour)
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Top 5 procurement materials contributing the greatest share of physical construction investment.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
                    {analyticsDerived.topMaterials.map((mat, idx) => (
                      <div
                        key={mat.tagId}
                        className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 relative overflow-hidden"
                      >
                        <div
                          className="absolute top-0 left-0 right-0 h-1"
                          style={{ backgroundColor: mat.hexColor || '#0ea5e9' }}
                        />
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          <span className="truncate">{mat.tagName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                        </div>
                        <div className="text-base font-bold text-slate-900 dark:text-white">
                          {formatINR(mat.value)}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
                          <span>{mat.count} items</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{mat.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. Quantity by Material Table */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Aggregated Quantity & Cost by Material
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Summary of physical quantities procured across the entire project lifecycle.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-4">Material / Item</th>
                        <th className="py-2.5 px-4">Unit of Measure</th>
                        <th className="py-2.5 px-4 text-right">Total Quantity</th>
                        <th className="py-2.5 px-4 text-right">Total Expenditure</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {analytics.quantityByExpense.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">
                            No materials recorded yet.
                          </td>
                        </tr>
                      ) : (
                        analytics.quantityByExpense.map((mat, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">
                              {mat.typeName}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500">
                              {mat.unitName}
                            </td>
                            <td className="py-2.5 px-4 text-right font-semibold text-slate-800 dark:text-slate-200">
                              {mat.totalQuantity}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                              {formatINR(mat.totalCost)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-400">
              Analytics data unavailable.
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: CONFIGURATION & LOOKUPS                                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Project Metadata Settings Form */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Project Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update project name, built-up sq ft area, and category classifications.
                </p>
              </div>
              {settingsSuccessMsg && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  {settingsSuccessMsg}
                </div>
              )}
            </div>

            <form onSubmit={handleSaveProjectSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Project / Category Name *
                  </label>
                  <input
                    type="text"
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category Code / Type
                  </label>
                  <input
                    type="text"
                    value={settingsCode}
                    onChange={(e) => setSettingsCode(e.target.value)}
                    placeholder="e.g. construction, business"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Built-up Area (Sq Ft)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={settingsTotalArea}
                    onChange={(e) => setSettingsTotalArea(e.target.value)}
                    placeholder="e.g. 3058"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Location / Notes
                </label>
                <textarea
                  rows={2}
                  value={settingsDescription}
                  onChange={(e) => setSettingsDescription(e.target.value)}
                  placeholder="Optional details about this project..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition shadow-sm"
                >
                  {isSavingSettings ? 'Saving...' : 'Save Project Details'}
                </button>
              </div>
            </form>
          </div>

          {/* Lookups Grid (Phases, Types, Tags, Units) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Phases Manager */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" />
                  Construction Phases ({project.phases?.length || 0})
                </h4>
              </div>

              {/* Add Phase Form */}
              <form onSubmit={handleAddPhase} className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="New phase name..."
                  value={newPhaseName}
                  onChange={(e) => setNewPhaseName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isAddingPhase || !newPhaseName.trim()}
                  className="px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  Add
                </button>
              </form>

              {/* List */}
              <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                {project.phases?.map((p) => (
                  <div key={p.id} className="py-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{p.name}</span>
                    <button
                      onClick={() => handleDeletePhase(p.id)}
                      className="text-slate-400 hover:text-red-500 p-1"
                      title="Delete Phase"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Tag Items Manager with Color */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-primary" />
                  Tag Items with Colors ({project.tags?.length || 0})
                </h4>
              </div>

              {/* Add Tag Form */}
              <form onSubmit={handleAddTag} className="flex gap-2 mb-3">
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-8 h-8 p-0.5 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                  title="Tag Color"
                />
                <input
                  type="text"
                  placeholder="New tag name (e.g. Steels)..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isAddingTag || !newTagName.trim()}
                  className="px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  Add
                </button>
              </form>

              {/* List */}
              <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                {project.tags?.map((t) => (
                  <div key={t.id} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: t.hex_color || '#0ea5e9' }}
                      />
                      <span className="font-medium text-slate-700 dark:text-slate-300">{t.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {t.hex_color || '#0ea5e9'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteTag(t.id)}
                      className="text-slate-400 hover:text-red-500 p-1"
                      title="Delete Tag"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Expense Types Manager */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-primary" />
                  Material / Expense Types ({project.types?.length || 0})
                </h4>
              </div>

              {/* Add Type Form */}
              <form onSubmit={handleAddType} className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="New type (e.g. Cement, Bricks)..."
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isAddingType || !newTypeName.trim()}
                  className="px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  Add
                </button>
              </form>

              {/* List */}
              <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                {project.types?.map((type) => (
                  <div key={type.id} className="py-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{type.name}</span>
                    <button
                      onClick={() => handleDeleteType(type.id)}
                      className="text-slate-400 hover:text-red-500 p-1"
                      title="Delete Type"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Units of Measure */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-primary" />
                  Units of Measurement ({units.length})
                </h4>
              </div>

              {/* Add Unit Form */}
              <form onSubmit={handleAddUnit} className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="New unit (e.g. Sq Ft, Ton, Liter)..."
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isAddingUnit || !newUnitName.trim()}
                  className="px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  Add
                </button>
              </form>

              {/* List */}
              <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                {units.map((u) => (
                  <div key={u.id} className="py-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{u.name}</span>
                    <span className="text-[10px] text-slate-400">Global Unit</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SLIDE-OVER DRAWER: ADD / EDIT EXPENSE                              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <SlideDrawer
        isOpen={isExpenseDrawerOpen}
        onClose={() => setIsExpenseDrawerOpen(false)}
        title={editingExpense ? 'Edit Expense Entry' : 'Log New Procurement Expense'}
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          {expenseFormError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-600 dark:text-red-400">
              {expenseFormError}
            </div>
          )}

          {/* Date & Phase */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Purchase Date *
              </label>
              <input
                type="date"
                value={formPurchaseDate}
                onChange={(e) => setFormPurchaseDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Construction Phase
              </label>
              <select
                value={formPhaseId}
                onChange={(e) => setFormPhaseId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Phase</option>
                {project.phases?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tag & Expense Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tag Item (Analytics Group)
              </label>
              <select
                value={formTagId}
                onChange={(e) => setFormTagId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Tag</option>
                {project.tags?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Material / Expense Type
              </label>
              <select
                value={formTypeId}
                onChange={(e) => setFormTypeId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Type</option>
                {project.types?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Name & Brand */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Product Name / Item
              </label>
              <input
                type="text"
                placeholder="e.g. 10mm TMT Bar, UltraTech"
                value={formProductName}
                onChange={(e) => setFormProductName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Brand / Supplier
              </label>
              <input
                type="text"
                placeholder="e.g. ARS, UltraTech, Tata"
                value={formBrand}
                onChange={(e) => setFormBrand(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Quantity, Unit & Rate */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                step="any"
                required
                value={formQuantity}
                onChange={(e) => handleQtyChange(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit of Measure
              </label>
              <select
                value={formUnitId}
                onChange={(e) => setFormUnitId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Rate / Unit (₹) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="Rate"
                value={formPricePerQty}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Total Cost with Auto-calculation */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Total Expenditure Cost (₹) *
              </label>
              <span className="text-[11px] text-slate-500">
                {formQuantity && formPricePerQty
                  ? `${formQuantity} × ₹${formPricePerQty}`
                  : 'Auto-calculated'}
              </span>
            </div>
            <input
              type="number"
              step="any"
              required
              value={formTotalCost}
              onChange={(e) => {
                setFormTotalCost(e.target.value);
                setIsTotalManuallyOverridden(true);
              }}
              className="w-full px-3 py-2 text-base font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {formTotalCost && (
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Formatted: {formatINR(formTotalCost)}
              </p>
            )}
          </div>

          {/* Exception Flag */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_exception_cb"
              checked={formIsException}
              onChange={(e) => setFormIsException(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-slate-300 dark:border-slate-700 focus:ring-primary/20"
            />
            <label htmlFor="is_exception_cb" className="text-xs text-slate-700 dark:text-slate-300 select-none cursor-pointer">
              Mark as non-standard or exception expenditure
            </label>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes / Invoicing Details
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Bill #1042, paid via UPI to Suresh Traders..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Drawer Actions */}
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsExpenseDrawerOpen(false)}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingExpense}
              className="px-4 py-2 text-xs sm:text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition shadow"
            >
              {isSavingExpense ? 'Saving...' : editingExpense ? 'Save Changes' : 'Log Expense'}
            </button>
          </div>
        </form>
      </SlideDrawer>

      {/* Delete Expense Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Delete Expense Entry?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Are you sure you want to remove the expense for{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {expenseToDelete.product_name || expenseToDelete.expense_type?.name || 'this item'}
              </strong>{' '}
              amounting to <strong className="text-emerald-600">{formatINR(expenseToDelete.total_cost)}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setExpenseToDelete(null)}
                disabled={isDeletingExpense}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteExpense}
                disabled={isDeletingExpense}
                className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeletingExpense ? 'Deleting...' : 'Delete Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
