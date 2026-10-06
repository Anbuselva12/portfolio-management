import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { I_TRACKER_REPOSITORY, ITrackerRepository } from '../repositories/interfaces';
import Decimal from 'decimal.js';

@Injectable()
export class TrackerService {
  constructor(
    @Inject(I_TRACKER_REPOSITORY) private readonly trackerRepo: ITrackerRepository,
  ) {}

  // ─── Projects ─────────────────────────────────────────────────────────────

  async getProjects(familyId: string) {
    const projects = await this.trackerRepo.findProjectsByFamilyId(familyId);

    // Attach summary stats for each project
    const enriched = await Promise.all(
      projects.map(async (project) => {
        const expenses = await this.trackerRepo.findExpensesByProjectId(project.id);
        const totalSpend = expenses.reduce(
          (sum, e) => sum.plus(new Decimal(e.total_cost.toString())),
          new Decimal(0),
        );

        let pricePerSqFt: string | null = null;
        if (project.total_area_sqft && Number(project.total_area_sqft) > 0) {
          pricePerSqFt = totalSpend
            .dividedBy(new Decimal(project.total_area_sqft.toString()))
            .toFixed(2);
        }

        const avgCostPerItem = expenses.length > 0
          ? totalSpend.dividedBy(expenses.length).toFixed(2)
          : '0.00';

        return {
          ...project,
          total_area_sqft: project.total_area_sqft ? project.total_area_sqft.toString() : null,
          totalSpend: totalSpend.toFixed(2),
          itemsCount: expenses.length,
          pricePerSqFt,
          avgCostPerItem,
          lastActivityDate: expenses[0]?.purchase_date || project.created_at,
        };
      }),
    );

    return enriched;
  }

  async getProject(familyId: string, projectId: string) {
    const project = await this.trackerRepo.findProjectById(projectId);
    if (!project || project.family_id !== familyId || !project.is_active) {
      throw new NotFoundException('Project not found');
    }

    const expenses = await this.trackerRepo.findExpensesByProjectId(project.id);
    const totalSpend = expenses.reduce(
      (sum, e) => sum.plus(new Decimal(e.total_cost.toString())),
      new Decimal(0),
    );

    let pricePerSqFt: string | null = null;
    if (project.total_area_sqft && Number(project.total_area_sqft) > 0) {
      pricePerSqFt = totalSpend
        .dividedBy(new Decimal(project.total_area_sqft.toString()))
        .toFixed(2);
    }

    const avgCostPerItem = expenses.length > 0
      ? totalSpend.dividedBy(expenses.length).toFixed(2)
      : '0.00';

    const phases = await this.trackerRepo.findPhasesByProjectId(projectId);
    const types = await this.trackerRepo.findTypesByProjectId(projectId);
    const tags = await this.trackerRepo.findTagsByProjectId(projectId);
    const units = await this.trackerRepo.findUnits();

    return {
      ...project,
      total_area_sqft: project.total_area_sqft ? project.total_area_sqft.toString() : null,
      totalSpend: totalSpend.toFixed(2),
      itemsCount: expenses.length,
      pricePerSqFt,
      avgCostPerItem,
      phases,
      types,
      tags,
      units,
    };
  }

  async createProject(familyId: string, memberId: string, dto: any) {
    const project = await this.trackerRepo.createProject({
      family_id: familyId,
      created_by_id: memberId,
      name: dto.name,
      code: dto.code || null,
      description: dto.description || null,
      total_area_sqft: dto.totalAreaSqFt ? new Decimal(dto.totalAreaSqFt) : null,
      currency: dto.currency || 'INR',
      is_active: true,
    });

    // Seed basic default phases & units if none exist
    const defaultPhases = ['Phase 1', 'Phase 2', 'Final Phase'];
    for (let i = 0; i < defaultPhases.length; i++) {
      await this.trackerRepo.createPhase({
        project_id: project.id,
        name: defaultPhases[i],
        sort_order: i + 1,
      });
    }

    return this.getProject(familyId, project.id);
  }

  async updateProject(familyId: string, projectId: string, dto: any) {
    const existing = await this.trackerRepo.findProjectById(projectId);
    if (!existing || existing.family_id !== familyId) {
      throw new NotFoundException('Project not found');
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.totalAreaSqFt !== undefined) {
      updateData.total_area_sqft = dto.totalAreaSqFt ? new Decimal(dto.totalAreaSqFt) : null;
    }

    await this.trackerRepo.updateProject(projectId, updateData);
    return this.getProject(familyId, projectId);
  }

  async deleteProject(familyId: string, projectId: string) {
    const existing = await this.trackerRepo.findProjectById(projectId);
    if (!existing || existing.family_id !== familyId) {
      throw new NotFoundException('Project not found');
    }
    await this.trackerRepo.deleteProject(projectId);
    return { success: true };
  }

  // ─── Phases, Types, Tags, Units ───────────────────────────────────────────

  async createPhase(familyId: string, projectId: string, dto: any) {
    await this.getProject(familyId, projectId);
    return this.trackerRepo.createPhase({
      project_id: projectId,
      name: dto.name,
      sort_order: dto.sortOrder || 0,
    });
  }

  async updatePhase(familyId: string, projectId: string, phaseId: string, dto: any) {
    await this.getProject(familyId, projectId);
    return this.trackerRepo.updatePhase(phaseId, dto);
  }

  async deletePhase(familyId: string, projectId: string, phaseId: string) {
    await this.getProject(familyId, projectId);
    await this.trackerRepo.deletePhase(phaseId);
    return { success: true };
  }

  async createType(familyId: string, projectId: string, dto: any) {
    await this.getProject(familyId, projectId);
    return this.trackerRepo.createType({
      project_id: projectId,
      name: dto.name,
      sort_order: dto.sortOrder || 0,
    });
  }

  async updateType(familyId: string, projectId: string, typeId: string, dto: any) {
    await this.getProject(familyId, projectId);
    return this.trackerRepo.updateType(typeId, dto);
  }

  async deleteType(familyId: string, projectId: string, typeId: string) {
    await this.getProject(familyId, projectId);
    await this.trackerRepo.deleteType(typeId);
    return { success: true };
  }

  async createTag(familyId: string, projectId: string, dto: any) {
    await this.getProject(familyId, projectId);
    return this.trackerRepo.createTag({
      project_id: projectId,
      name: dto.name,
      hex_color: dto.hexColor || null,
      sort_order: dto.sortOrder || 0,
    });
  }

  async updateTag(familyId: string, projectId: string, tagId: string, dto: any) {
    await this.getProject(familyId, projectId);
    return this.trackerRepo.updateTag(tagId, {
      name: dto.name,
      hex_color: dto.hexColor,
      sort_order: dto.sortOrder,
    });
  }

  async deleteTag(familyId: string, projectId: string, tagId: string) {
    await this.getProject(familyId, projectId);
    await this.trackerRepo.deleteTag(tagId);
    return { success: true };
  }

  async getUnits() {
    return this.trackerRepo.findUnits();
  }

  async createUnit(dto: any) {
    return this.trackerRepo.createUnit({
      name: dto.name,
      sort_order: dto.sortOrder || 0,
    });
  }

  // ─── Expenses ─────────────────────────────────────────────────────────────

  async getExpenses(
    familyId: string,
    projectId: string,
    query: {
      phaseId?: string;
      tagId?: string;
      typeId?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    await this.getProject(familyId, projectId);
    let expenses = await this.trackerRepo.findExpensesByProjectId(projectId, {
      phaseId: query.phaseId,
      tagId: query.tagId,
      typeId: query.typeId,
    });

    if (query.search && query.search.trim()) {
      const q = query.search.toLowerCase().trim();
      expenses = expenses.filter(
        (e) =>
          (e.product_name && e.product_name.toLowerCase().includes(q)) ||
          (e.brand && e.brand.toLowerCase().includes(q)) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          ((e as any).expense_type?.name && (e as any).expense_type.name.toLowerCase().includes(q)) ||
          ((e as any).tag_item?.name && (e as any).tag_item.name.toLowerCase().includes(q)),
      );
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(query.limit) || 50));
    const total = expenses.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = expenses.slice((page - 1) * limit, page * limit);

    return {
      expenses: paginated.map((e) => ({
        ...e,
        quantity: e.quantity.toString(),
        price_per_qty: e.price_per_qty.toString(),
        total_cost: e.total_cost.toString(),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getExpense(familyId: string, expenseId: string) {
    const expense = await this.trackerRepo.findExpenseById(expenseId);
    if (!expense) throw new NotFoundException('Expense not found');
    await this.getProject(familyId, expense.project_id);
    return {
      ...expense,
      quantity: expense.quantity.toString(),
      price_per_qty: expense.price_per_qty.toString(),
      total_cost: expense.total_cost.toString(),
    };
  }

  async createExpense(familyId: string, memberId: string, projectId: string, dto: any) {
    await this.getProject(familyId, projectId);

    const q = new Decimal(dto.quantity || 1);
    const rate = new Decimal(dto.pricePerQty || 0);
    const total = dto.totalCost ? new Decimal(dto.totalCost) : q.times(rate);

    const expense = await this.trackerRepo.createExpense({
      project_id: projectId,
      expense_type_id: dto.expenseTypeId || null,
      product_name: dto.productName || null,
      brand: dto.brand || null,
      description: dto.description || null,
      quantity: q,
      price_per_qty: rate,
      unit_id: dto.unitId || null,
      is_exception: Boolean(dto.isException),
      total_cost: total,
      project_phase_id: dto.projectPhaseId || null,
      tag_item_id: dto.tagItemId || null,
      purchase_date: dto.purchaseDate ? new Date(dto.purchaseDate) : new Date(),
      created_by_id: memberId,
    });

    return {
      ...expense,
      quantity: expense.quantity.toString(),
      price_per_qty: expense.price_per_qty.toString(),
      total_cost: expense.total_cost.toString(),
    };
  }

  async updateExpense(familyId: string, expenseId: string, dto: any) {
    const existing = await this.trackerRepo.findExpenseById(expenseId);
    if (!existing) throw new NotFoundException('Expense not found');
    await this.getProject(familyId, existing.project_id);

    const updateData: any = {};
    if (dto.expenseTypeId !== undefined) updateData.expense_type_id = dto.expenseTypeId;
    if (dto.productName !== undefined) updateData.product_name = dto.productName;
    if (dto.brand !== undefined) updateData.brand = dto.brand;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.unitId !== undefined) updateData.unit_id = dto.unitId;
    if (dto.projectPhaseId !== undefined) updateData.project_phase_id = dto.projectPhaseId;
    if (dto.tagItemId !== undefined) updateData.tag_item_id = dto.tagItemId;
    if (dto.purchaseDate) updateData.purchase_date = new Date(dto.purchaseDate);
    if (dto.isException !== undefined) updateData.is_exception = Boolean(dto.isException);

    const q = dto.quantity !== undefined ? new Decimal(dto.quantity) : new Decimal(existing.quantity.toString());
    const rate = dto.pricePerQty !== undefined ? new Decimal(dto.pricePerQty) : new Decimal(existing.price_per_qty.toString());
    const total = dto.totalCost !== undefined ? new Decimal(dto.totalCost) : q.times(rate);

    updateData.quantity = q;
    updateData.price_per_qty = rate;
    updateData.total_cost = total;

    const updated = await this.trackerRepo.updateExpense(expenseId, updateData);
    return {
      ...updated,
      quantity: updated.quantity.toString(),
      price_per_qty: updated.price_per_qty.toString(),
      total_cost: updated.total_cost.toString(),
    };
  }

  async deleteExpense(familyId: string, expenseId: string) {
    const existing = await this.trackerRepo.findExpenseById(expenseId);
    if (!existing) throw new NotFoundException('Expense not found');
    await this.getProject(familyId, existing.project_id);
    await this.trackerRepo.deleteExpense(expenseId);
    return { success: true };
  }

  // ─── Analytics & Reports ──────────────────────────────────────────────────

  async getAnalytics(
    familyId: string,
    projectId: string,
    options: { includeLabour?: boolean; phaseId?: string } = {},
  ) {
    const project = await this.getProject(familyId, projectId);
    const includeLabour = options.includeLabour !== false;

    let expenses = await this.trackerRepo.findExpensesByProjectId(projectId);

    // If includeLabour is false, filter out items where tag is "Labour Cost" or "Tiles Labour" or phase is "Labour"
    if (!includeLabour) {
      expenses = expenses.filter((e) => {
        const tagName = (e as any).tag_item?.name?.toLowerCase() || '';
        const phaseName = (e as any).phase?.name?.toLowerCase() || '';
        const isLabour = tagName.includes('labour') || phaseName.includes('labour');
        return !isLabour;
      });
    }

    const totalSpend = expenses.reduce(
      (sum, e) => sum.plus(new Decimal(e.total_cost.toString())),
      new Decimal(0),
    );

    let pricePerSqFt: string | null = null;
    if (project.total_area_sqft && Number(project.total_area_sqft) > 0) {
      pricePerSqFt = totalSpend
        .dividedBy(new Decimal(project.total_area_sqft.toString()))
        .toFixed(2);
    }

    // 1. Price By Phase
    const phaseSpendMap = new Map<string, { id: string; name: string; total: Decimal; count: number }>();
    for (const ph of project.phases) {
      phaseSpendMap.set(ph.id, { id: ph.id, name: ph.name, total: new Decimal(0), count: 0 });
    }

    for (const exp of expenses) {
      const phId = exp.project_phase_id || 'unknown';
      if (!phaseSpendMap.has(phId)) {
        phaseSpendMap.set(phId, {
          id: phId,
          name: (exp as any).phase?.name || 'Unassigned',
          total: new Decimal(0),
          count: 0,
        });
      }
      const item = phaseSpendMap.get(phId)!;
      item.total = item.total.plus(new Decimal(exp.total_cost.toString()));
      item.count += 1;
    }

    const priceByPhase = Array.from(phaseSpendMap.values())
      .filter((p) => p.total.greaterThan(0))
      .sort((a, b) => b.total.minus(a.total).toNumber())
      .map((p) => ({
        phaseId: p.id,
        phaseName: p.name,
        totalCost: p.total.toFixed(2),
        percentage: totalSpend.greaterThan(0)
          ? p.total.dividedBy(totalSpend).times(100).toFixed(1)
          : '0.0',
        count: p.count,
      }));

    // 2. Percentage of Expense (By Tag Items)
    const tagSpendMap = new Map<string, { id: string; name: string; hexColor: string; total: Decimal; count: number }>();
    for (const tag of project.tags) {
      tagSpendMap.set(tag.id, {
        id: tag.id,
        name: tag.name,
        hexColor: tag.hex_color || '#0ea5e9',
        total: new Decimal(0),
        count: 0,
      });
    }

    for (const exp of expenses) {
      const tagId = exp.tag_item_id || 'unknown';
      if (!tagSpendMap.has(tagId)) {
        tagSpendMap.set(tagId, {
          id: tagId,
          name: (exp as any).tag_item?.name || 'General',
          hexColor: (exp as any).tag_item?.hex_color || '#94a3b8',
          total: new Decimal(0),
          count: 0,
        });
      }
      const item = tagSpendMap.get(tagId)!;
      item.total = item.total.plus(new Decimal(exp.total_cost.toString()));
      item.count += 1;
    }

    const percentageByTag = Array.from(tagSpendMap.values())
      .filter((t) => t.total.greaterThan(0))
      .sort((a, b) => b.total.minus(a.total).toNumber())
      .map((t) => ({
        tagId: t.id,
        tagName: t.name,
        hexColor: t.hexColor,
        totalCost: t.total.toFixed(2),
        percentage: totalSpend.greaterThan(0)
          ? t.total.dividedBy(totalSpend).times(100).toFixed(1)
          : '0.0',
        count: t.count,
      }));

    // 3. Quantity By Expense Material
    const qtyTypeMap = new Map<string, { typeName: string; unitName: string; totalQty: Decimal; totalCost: Decimal }>();
    for (const exp of expenses) {
      const typeName = (exp as any).expense_type?.name || 'Misc Item';
      const unitName = (exp as any).unit?.name || 'Unit';
      const key = `${typeName}_${unitName}`;

      if (!qtyTypeMap.has(key)) {
        qtyTypeMap.set(key, {
          typeName,
          unitName,
          totalQty: new Decimal(0),
          totalCost: new Decimal(0),
        });
      }
      const entry = qtyTypeMap.get(key)!;
      entry.totalQty = entry.totalQty.plus(new Decimal(exp.quantity.toString()));
      entry.totalCost = entry.totalCost.plus(new Decimal(exp.total_cost.toString()));
    }

    const quantityByExpense = Array.from(qtyTypeMap.values())
      .sort((a, b) => b.totalCost.minus(a.totalCost).toNumber())
      .map((q) => ({
        typeName: q.typeName,
        unitName: q.unitName,
        totalQuantity: q.totalQty.toFixed(2),
        totalCost: q.totalCost.toFixed(2),
      }));

    // 4. Stacked Phase Bar Chart Data: Phase vs Tags
    const phaseStackedData = priceByPhase.map((ph) => {
      const phExpenses = expenses.filter((e) => (e.project_phase_id || 'unknown') === ph.phaseId);
      const row: any = {
        phase: ph.phaseName,
        total: Number(ph.totalCost),
      };
      for (const t of percentageByTag) {
        const tagTotal = phExpenses
          .filter((e) => (e.tag_item_id || 'unknown') === t.tagId)
          .reduce((sum, e) => sum.plus(new Decimal(e.total_cost.toString())), new Decimal(0));
        row[t.tagName] = tagTotal.toNumber();
      }
      return row;
    });

    return {
      summary: {
        totalSpend: totalSpend.toFixed(2),
        itemsCount: expenses.length,
        totalAreaSqFt: project.total_area_sqft,
        pricePerSqFt,
        avgCostPerItem: expenses.length > 0 ? totalSpend.dividedBy(expenses.length).toFixed(2) : '0.00',
        includeLabour,
        dominantPhase: priceByPhase[0]?.phaseName || 'N/A',
      },
      priceByPhase,
      percentageByTag,
      quantityByExpense,
      phaseStackedData,
    };
  }
}
