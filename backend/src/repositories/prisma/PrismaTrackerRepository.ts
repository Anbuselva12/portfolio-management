import { Injectable } from '@nestjs/common';
import {
  TrackerProject,
  TrackerPhase,
  TrackerExpenseType,
  TrackerTagItem,
  TrackerUnit,
  TrackerExpense,
  ProjectLoanAllocation,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ITrackerRepository } from '../interfaces';

@Injectable()
export class PrismaTrackerRepository implements ITrackerRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Projects
  async findProjectsByFamilyId(familyId: string): Promise<TrackerProject[]> {
    return this.prisma.trackerProject.findMany({
      where: { family_id: familyId, is_active: true },
      orderBy: { created_at: 'desc' },
      include: {
        phases: { where: { is_active: true }, orderBy: { sort_order: 'asc' } },
        types: { where: { is_active: true }, orderBy: { sort_order: 'asc' } },
        tags: { where: { is_active: true }, orderBy: { sort_order: 'asc' } },
      },
    });
  }

  async findProjectById(id: string): Promise<TrackerProject | null> {
    return this.prisma.trackerProject.findUnique({
      where: { id },
      include: {
        phases: { where: { is_active: true }, orderBy: { sort_order: 'asc' } },
        types: { where: { is_active: true }, orderBy: { sort_order: 'asc' } },
        tags: { where: { is_active: true }, orderBy: { sort_order: 'asc' } },
      },
    });
  }

  async createProject(data: any): Promise<TrackerProject> {
    return this.prisma.trackerProject.create({ data });
  }

  async updateProject(id: string, data: Partial<TrackerProject>): Promise<TrackerProject> {
    return this.prisma.trackerProject.update({ where: { id }, data });
  }

  async deleteProject(id: string): Promise<void> {
    await this.prisma.trackerProject.update({
      where: { id },
      data: { is_active: false },
    });
  }

  // Phases
  async findPhasesByProjectId(projectId: string): Promise<TrackerPhase[]> {
    return this.prisma.trackerPhase.findMany({
      where: { project_id: projectId, is_active: true },
      orderBy: { sort_order: 'asc' },
    });
  }

  async createPhase(data: any): Promise<TrackerPhase> {
    return this.prisma.trackerPhase.create({ data });
  }

  async updatePhase(id: string, data: Partial<TrackerPhase>): Promise<TrackerPhase> {
    return this.prisma.trackerPhase.update({ where: { id }, data });
  }

  async deletePhase(id: string): Promise<void> {
    await this.prisma.trackerPhase.update({ where: { id }, data: { is_active: false } });
  }

  // Types
  async findTypesByProjectId(projectId: string): Promise<TrackerExpenseType[]> {
    return this.prisma.trackerExpenseType.findMany({
      where: { project_id: projectId, is_active: true },
      orderBy: { sort_order: 'asc' },
    });
  }

  async createType(data: any): Promise<TrackerExpenseType> {
    return this.prisma.trackerExpenseType.create({ data });
  }

  async updateType(id: string, data: Partial<TrackerExpenseType>): Promise<TrackerExpenseType> {
    return this.prisma.trackerExpenseType.update({ where: { id }, data });
  }

  async deleteType(id: string): Promise<void> {
    await this.prisma.trackerExpenseType.update({ where: { id }, data: { is_active: false } });
  }

  // Tags
  async findTagsByProjectId(projectId: string): Promise<TrackerTagItem[]> {
    return this.prisma.trackerTagItem.findMany({
      where: { project_id: projectId, is_active: true },
      orderBy: { sort_order: 'asc' },
    });
  }

  async createTag(data: any): Promise<TrackerTagItem> {
    return this.prisma.trackerTagItem.create({ data });
  }

  async updateTag(id: string, data: Partial<TrackerTagItem>): Promise<TrackerTagItem> {
    return this.prisma.trackerTagItem.update({ where: { id }, data });
  }

  async deleteTag(id: string): Promise<void> {
    await this.prisma.trackerTagItem.update({ where: { id }, data: { is_active: false } });
  }

  // Units
  async findUnits(): Promise<TrackerUnit[]> {
    return this.prisma.trackerUnit.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
    });
  }

  async createUnit(data: any): Promise<TrackerUnit> {
    return this.prisma.trackerUnit.create({ data });
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
    const where: any = {
      project_id: projectId,
      is_active: true,
    };

    if (filter?.phaseId && filter.phaseId !== 'all') {
      where.project_phase_id = filter.phaseId;
    }

    if (filter?.tagId && filter.tagId !== 'all') {
      where.tag_item_id = filter.tagId;
    }

    if (filter?.typeId && filter.typeId !== 'all') {
      where.expense_type_id = filter.typeId;
    }

    return this.prisma.trackerExpense.findMany({
      where,
      orderBy: { purchase_date: 'desc' },
      include: {
        expense_type: true,
        unit: true,
        phase: true,
        tag_item: true,
      },
    });
  }

  async findExpenseById(id: string): Promise<TrackerExpense | null> {
    return this.prisma.trackerExpense.findUnique({
      where: { id },
      include: {
        expense_type: true,
        unit: true,
        phase: true,
        tag_item: true,
      },
    });
  }

  async createExpense(data: any): Promise<TrackerExpense> {
    return this.prisma.trackerExpense.create({
      data,
      include: {
        expense_type: true,
        unit: true,
        phase: true,
        tag_item: true,
      },
    });
  }

  async updateExpense(id: string, data: Partial<TrackerExpense>): Promise<TrackerExpense> {
    return this.prisma.trackerExpense.update({
      where: { id },
      data,
      include: {
        expense_type: true,
        unit: true,
        phase: true,
        tag_item: true,
      },
    });
  }

  async deleteExpense(id: string): Promise<void> {
    await this.prisma.trackerExpense.update({
      where: { id },
      data: { is_active: false },
    });
  }

  // Loan → project allocations
  async findAllocationsByProjectId(projectId: string): Promise<ProjectLoanAllocation[]> {
    return this.prisma.projectLoanAllocation.findMany({ where: { project_id: projectId } });
  }

  async findAllocationsByFamilyId(familyId: string): Promise<ProjectLoanAllocation[]> {
    return this.prisma.projectLoanAllocation.findMany({
      where: { project: { family_id: familyId, is_active: true } },
    });
  }

  async findAllocationsByLoanId(loanId: string): Promise<ProjectLoanAllocation[]> {
    return this.prisma.projectLoanAllocation.findMany({ where: { loan_id: loanId } });
  }

  async replaceLoanAllocations(
    loanId: string,
    rows: Array<{ project_id: string; amount: string }>,
  ): Promise<ProjectLoanAllocation[]> {
    await this.prisma.$transaction([
      this.prisma.projectLoanAllocation.deleteMany({ where: { loan_id: loanId } }),
      ...rows.map((r) =>
        this.prisma.projectLoanAllocation.create({
          data: { loan_id: loanId, project_id: r.project_id, amount: r.amount },
        }),
      ),
    ]);
    return this.findAllocationsByLoanId(loanId);
  }
}
