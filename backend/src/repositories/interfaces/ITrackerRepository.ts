import {
  TrackerProject,
  TrackerPhase,
  TrackerExpenseType,
  TrackerTagItem,
  TrackerUnit,
  TrackerExpense,
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
}

export const I_TRACKER_REPOSITORY = 'ITrackerRepository';
