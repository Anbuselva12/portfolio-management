import { Injectable } from '@nestjs/common';
import {
  TrackerProject,
  TrackerPhase,
  TrackerExpenseType,
  TrackerTagItem,
  TrackerUnit,
  TrackerExpense,
  ProjectLoanAllocation,
  Prisma,
} from '@prisma/client';
import { ITrackerRepository } from '../interfaces';
import { LocalStorageStore } from './LocalStorageStore';

@Injectable()
export class LocalStorageTrackerRepository implements ITrackerRepository {
  private get projects(): TrackerProject[] {
    return LocalStorageStore.getCollection<TrackerProject>('tracker_projects');
  }

  private get phases(): TrackerPhase[] {
    return LocalStorageStore.getCollection<TrackerPhase>('tracker_phases');
  }

  private get types(): TrackerExpenseType[] {
    return LocalStorageStore.getCollection<TrackerExpenseType>('tracker_expense_types');
  }

  private get tags(): TrackerTagItem[] {
    return LocalStorageStore.getCollection<TrackerTagItem>('tracker_tag_items');
  }

  private get units(): TrackerUnit[] {
    return LocalStorageStore.getCollection<TrackerUnit>('tracker_units');
  }

  private get expenses(): TrackerExpense[] {
    return LocalStorageStore.getCollection<TrackerExpense>('tracker_expenses');
  }

  private get allocations(): ProjectLoanAllocation[] {
    return LocalStorageStore.getCollection<ProjectLoanAllocation>('tracker_project_loan_allocations');
  }

  // Projects
  async findProjectsByFamilyId(familyId: string): Promise<TrackerProject[]> {
    return this.projects
      .filter((p) => p.family_id === familyId && p.is_active)
      .map((p) => ({
        ...p,
        phases: this.phases.filter((ph) => ph.project_id === p.id && ph.is_active),
        types: this.types.filter((t) => t.project_id === p.id && t.is_active),
        tags: this.tags.filter((tg) => tg.project_id === p.id && tg.is_active),
      })) as any;
  }

  async findProjectById(id: string): Promise<TrackerProject | null> {
    const p = this.projects.find((pr) => pr.id === id);
    if (!p) return null;
    return {
      ...p,
      phases: this.phases.filter((ph) => ph.project_id === p.id && ph.is_active),
      types: this.types.filter((t) => t.project_id === p.id && t.is_active),
      tags: this.tags.filter((tg) => tg.project_id === p.id && tg.is_active),
    } as any;
  }

  async createProject(data: any): Promise<TrackerProject> {
    const project: TrackerProject = {
      id: LocalStorageStore.generateId(),
      family_id: data.family_id,
      created_by_id: data.created_by_id,
      name: data.name,
      code: data.code || null,
      description: data.description || null,
      total_area_sqft: data.total_area_sqft ? new Prisma.Decimal(data.total_area_sqft) : null,
      current_value: data.current_value ? new Prisma.Decimal(data.current_value) : null,
      currency: data.currency || 'INR',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.projects.push(project);
    return { ...project };
  }

  async updateProject(id: string, data: Partial<TrackerProject>): Promise<TrackerProject> {
    const idx = this.projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Project ${id} not found`);
    const updated = {
      ...this.projects[idx],
      ...data,
      total_area_sqft: data.total_area_sqft !== undefined
        ? (data.total_area_sqft ? new Prisma.Decimal(data.total_area_sqft as any) : null)
        : this.projects[idx].total_area_sqft,
      current_value: data.current_value !== undefined
        ? (data.current_value ? new Prisma.Decimal(data.current_value as any) : null)
        : this.projects[idx].current_value,
      updated_at: new Date(),
    };
    this.projects[idx] = updated;
    return { ...updated };
  }

  async deleteProject(id: string): Promise<void> {
    const idx = this.projects.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.projects[idx].is_active = false;
    }
  }

  // Phases
  async findPhasesByProjectId(projectId: string): Promise<TrackerPhase[]> {
    return this.phases
      .filter((p) => p.project_id === projectId && p.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => ({ ...p }));
  }

  async createPhase(data: any): Promise<TrackerPhase> {
    const phase: TrackerPhase = {
      id: LocalStorageStore.generateId(),
      project_id: data.project_id,
      name: data.name,
      sort_order: data.sort_order || 0,
      is_active: true,
      created_at: new Date(),
    };
    this.phases.push(phase);
    return { ...phase };
  }

  async updatePhase(id: string, data: Partial<TrackerPhase>): Promise<TrackerPhase> {
    const idx = this.phases.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Phase ${id} not found`);
    const updated = { ...this.phases[idx], ...data };
    this.phases[idx] = updated;
    return { ...updated };
  }

  async deletePhase(id: string): Promise<void> {
    const idx = this.phases.findIndex((p) => p.id === id);
    if (idx !== -1) this.phases[idx].is_active = false;
  }

  // Types
  async findTypesByProjectId(projectId: string): Promise<TrackerExpenseType[]> {
    return this.types
      .filter((t) => t.project_id === projectId && t.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((t) => ({ ...t }));
  }

  async createType(data: any): Promise<TrackerExpenseType> {
    const type: TrackerExpenseType = {
      id: LocalStorageStore.generateId(),
      project_id: data.project_id,
      name: data.name,
      sort_order: data.sort_order || 0,
      is_active: true,
      created_at: new Date(),
    };
    this.types.push(type);
    return { ...type };
  }

  async updateType(id: string, data: Partial<TrackerExpenseType>): Promise<TrackerExpenseType> {
    const idx = this.types.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Type ${id} not found`);
    const updated = { ...this.types[idx], ...data };
    this.types[idx] = updated;
    return { ...updated };
  }

  async deleteType(id: string): Promise<void> {
    const idx = this.types.findIndex((t) => t.id === id);
    if (idx !== -1) this.types[idx].is_active = false;
  }

  // Tags
  async findTagsByProjectId(projectId: string): Promise<TrackerTagItem[]> {
    return this.tags
      .filter((t) => t.project_id === projectId && t.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((t) => ({ ...t }));
  }

  async createTag(data: any): Promise<TrackerTagItem> {
    const tag: TrackerTagItem = {
      id: LocalStorageStore.generateId(),
      project_id: data.project_id,
      name: data.name,
      hex_color: data.hex_color || null,
      sort_order: data.sort_order || 0,
      is_active: true,
      created_at: new Date(),
    };
    this.tags.push(tag);
    return { ...tag };
  }

  async updateTag(id: string, data: Partial<TrackerTagItem>): Promise<TrackerTagItem> {
    const idx = this.tags.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Tag ${id} not found`);
    const updated = { ...this.tags[idx], ...data };
    this.tags[idx] = updated;
    return { ...updated };
  }

  async deleteTag(id: string): Promise<void> {
    const idx = this.tags.findIndex((t) => t.id === id);
    if (idx !== -1) this.tags[idx].is_active = false;
  }

  // Units
  async findUnits(): Promise<TrackerUnit[]> {
    return this.units.filter((u) => u.is_active).map((u) => ({ ...u }));
  }

  async createUnit(data: any): Promise<TrackerUnit> {
    const unit: TrackerUnit = {
      id: LocalStorageStore.generateId(),
      name: data.name,
      sort_order: data.sort_order || 0,
      is_active: true,
      created_at: new Date(),
    };
    this.units.push(unit);
    return { ...unit };
  }

  // Expenses
  async findExpensesByProjectId(
    projectId: string,
    filter?: {
      phaseId?: string;
      tagId?: string;
      typeId?: string;
      search?: string;
      includeLabour?: boolean;
    },
  ): Promise<TrackerExpense[]> {
    let result = this.expenses.filter((e) => e.project_id === projectId && e.is_active);

    if (filter?.phaseId && filter.phaseId !== 'all') {
      result = result.filter((e) => e.project_phase_id === filter.phaseId);
    }
    if (filter?.tagId && filter.tagId !== 'all') {
      result = result.filter((e) => e.tag_item_id === filter.tagId);
    }
    if (filter?.typeId && filter.typeId !== 'all') {
      result = result.filter((e) => e.expense_type_id === filter.typeId);
    }

    result.sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());

    return result.map((e) => ({
      ...e,
      expense_type: this.types.find((t) => t.id === e.expense_type_id) || null,
      unit: this.units.find((u) => u.id === e.unit_id) || null,
      phase: this.phases.find((p) => p.id === e.project_phase_id) || null,
      tag_item: this.tags.find((tg) => tg.id === e.tag_item_id) || null,
    })) as any;
  }

  async findExpenseById(id: string): Promise<TrackerExpense | null> {
    const e = this.expenses.find((exp) => exp.id === id);
    if (!e) return null;
    return {
      ...e,
      expense_type: this.types.find((t) => t.id === e.expense_type_id) || null,
      unit: this.units.find((u) => u.id === e.unit_id) || null,
      phase: this.phases.find((p) => p.id === e.project_phase_id) || null,
      tag_item: this.tags.find((tg) => tg.id === e.tag_item_id) || null,
    } as any;
  }

  async createExpense(data: any): Promise<TrackerExpense> {
    const q = new Prisma.Decimal(data.quantity);
    const rate = new Prisma.Decimal(data.price_per_qty);
    const total = data.total_cost ? new Prisma.Decimal(data.total_cost) : q.times(rate);

    const expense: TrackerExpense = {
      id: LocalStorageStore.generateId(),
      project_id: data.project_id,
      expense_type_id: data.expense_type_id || null,
      product_name: data.product_name || null,
      brand: data.brand || null,
      description: data.description || null,
      quantity: q,
      price_per_qty: rate,
      unit_id: data.unit_id || null,
      is_exception: Boolean(data.is_exception),
      total_cost: total,
      project_phase_id: data.project_phase_id || null,
      tag_item_id: data.tag_item_id || null,
      purchase_date: new Date(data.purchase_date || Date.now()),
      created_by_id: data.created_by_id || null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.expenses.push(expense);
    return {
      ...expense,
      expense_type: this.types.find((t) => t.id === expense.expense_type_id) || null,
      unit: this.units.find((u) => u.id === expense.unit_id) || null,
      phase: this.phases.find((p) => p.id === expense.project_phase_id) || null,
      tag_item: this.tags.find((tg) => tg.id === expense.tag_item_id) || null,
    } as any;
  }

  async updateExpense(id: string, data: Partial<TrackerExpense>): Promise<TrackerExpense> {
    const idx = this.expenses.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error(`Expense ${id} not found`);

    const q = data.quantity ? new Prisma.Decimal(data.quantity as any) : this.expenses[idx].quantity;
    const rate = data.price_per_qty ? new Prisma.Decimal(data.price_per_qty as any) : this.expenses[idx].price_per_qty;
    const total = data.total_cost ? new Prisma.Decimal(data.total_cost as any) : q.times(rate);

    const updated = {
      ...this.expenses[idx],
      ...data,
      quantity: q,
      price_per_qty: rate,
      total_cost: total,
      updated_at: new Date(),
    };
    this.expenses[idx] = updated;
    return {
      ...updated,
      expense_type: this.types.find((t) => t.id === updated.expense_type_id) || null,
      unit: this.units.find((u) => u.id === updated.unit_id) || null,
      phase: this.phases.find((p) => p.id === updated.project_phase_id) || null,
      tag_item: this.tags.find((tg) => tg.id === updated.tag_item_id) || null,
    } as any;
  }

  async deleteExpense(id: string): Promise<void> {
    const idx = this.expenses.findIndex((e) => e.id === id);
    if (idx !== -1) {
      this.expenses[idx].is_active = false;
    }
  }

  // Loan → project allocations
  async findAllocationsByProjectId(projectId: string): Promise<ProjectLoanAllocation[]> {
    return this.allocations.filter((a) => a.project_id === projectId).map((a) => ({ ...a }));
  }

  async findAllocationsByFamilyId(familyId: string): Promise<ProjectLoanAllocation[]> {
    const projectIds = new Set(
      this.projects.filter((p) => p.family_id === familyId && p.is_active).map((p) => p.id),
    );
    return this.allocations.filter((a) => projectIds.has(a.project_id)).map((a) => ({ ...a }));
  }

  async findAllocationsByLoanId(loanId: string): Promise<ProjectLoanAllocation[]> {
    return this.allocations.filter((a) => a.loan_id === loanId).map((a) => ({ ...a }));
  }

  async replaceLoanAllocations(
    loanId: string,
    rows: Array<{ project_id: string; amount: string }>,
  ): Promise<ProjectLoanAllocation[]> {
    const store = this.allocations;
    for (let i = store.length - 1; i >= 0; i--) {
      if (store[i].loan_id === loanId) store.splice(i, 1);
    }
    const now = new Date();
    for (const r of rows) {
      store.push({
        id: LocalStorageStore.generateId(),
        project_id: r.project_id,
        loan_id: loanId,
        amount: new Prisma.Decimal(r.amount),
        created_at: now,
        updated_at: now,
      });
    }
    return this.findAllocationsByLoanId(loanId);
  }
}
