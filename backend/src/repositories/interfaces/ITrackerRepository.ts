import {
  TrackerProject,
  TrackerPhase,
  TrackerExpenseType,
  TrackerTagItem,
  TrackerUnit,
  TrackerExpense,
  ProjectLoanAllocation,
} from '@prisma/client';

export interface ITrackerRepository {
  // Projects
  findProjectsByFamilyId(familyId: string): Promise<TrackerProject[]>;
  findProjectById(id: string): Promise<TrackerProject | null>;
  createProject(data: any): Promise<TrackerProject>;
  updateProject(id: string, data: Partial<TrackerProject>): Promise<TrackerProject>;
  deleteProject(id: string): Promise<void>;

  // Phases
  findPhasesByProjectId(projectId: string): Promise<TrackerPhase[]>;
  createPhase(data: any): Promise<TrackerPhase>;
  updatePhase(id: string, data: Partial<TrackerPhase>): Promise<TrackerPhase>;
  deletePhase(id: string): Promise<void>;

  // Types
  findTypesByProjectId(projectId: string): Promise<TrackerExpenseType[]>;
  createType(data: any): Promise<TrackerExpenseType>;
  updateType(id: string, data: Partial<TrackerExpenseType>): Promise<TrackerExpenseType>;
  deleteType(id: string): Promise<void>;

  // Tags
  findTagsByProjectId(projectId: string): Promise<TrackerTagItem[]>;
  createTag(data: any): Promise<TrackerTagItem>;
  updateTag(id: string, data: Partial<TrackerTagItem>): Promise<TrackerTagItem>;
  deleteTag(id: string): Promise<void>;

  // Units
  findUnits(): Promise<TrackerUnit[]>;
  createUnit(data: any): Promise<TrackerUnit>;

  // Expenses
  findExpensesByProjectId(projectId: string, filter?: {
    phaseId?: string;
    tagId?: string;
    typeId?: string;
    search?: string;
    includeLabour?: boolean;
  }): Promise<TrackerExpense[]>;
  findExpenseById(id: string): Promise<TrackerExpense | null>;
  createExpense(data: any): Promise<TrackerExpense>;
  updateExpense(id: string, data: Partial<TrackerExpense>): Promise<TrackerExpense>;
  deleteExpense(id: string): Promise<void>;

  // Loan → project allocations (one loan may fund several projects)
  /** All allocations of a project. */
  findAllocationsByProjectId(projectId: string): Promise<ProjectLoanAllocation[]>;
  /** All allocations for every active project of a family (single query; avoids N+1). */
  findAllocationsByFamilyId(familyId: string): Promise<ProjectLoanAllocation[]>;
  /** All allocations of a loan. */
  findAllocationsByLoanId(loanId: string): Promise<ProjectLoanAllocation[]>;
  /** Atomically replaces every allocation of a loan with the given rows (empty array clears the tag). */
  replaceLoanAllocations(
    loanId: string,
    rows: Array<{ project_id: string; amount: string }>,
  ): Promise<ProjectLoanAllocation[]>;
}

export const I_TRACKER_REPOSITORY = 'ITrackerRepository';
