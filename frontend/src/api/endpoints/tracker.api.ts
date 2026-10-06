import { api } from '../axios';
import {
  TrackerProject,
  TrackerExpense,
  TrackerPhase,
  TrackerExpenseType,
  TrackerTagItem,
  TrackerUnit,
  TrackerAnalytics,
} from '../../types';

export interface ExpensesQueryParams {
  phaseId?: string;
  tagId?: string;
  typeId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ExpensesResponse {
  expenses: TrackerExpense[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const trackerApi = {
  // Projects
  getProjects: async (): Promise<TrackerProject[]> =>
    (await api.get('/tracker/projects')).data,

  getProject: async (id: string): Promise<TrackerProject> =>
    (await api.get(`/tracker/projects/${id}`)).data,

  createProject: async (data: {
    name: string;
    code?: string;
    description?: string;
    totalAreaSqFt?: number | string;
    currency?: string;
  }): Promise<TrackerProject> =>
    (await api.post('/tracker/projects', data)).data,

  updateProject: async (
    id: string,
    data: Partial<{
      name: string;
      code: string;
      description: string;
      totalAreaSqFt: number | string;
      currency: string;
    }>,
  ): Promise<TrackerProject> =>
    (await api.patch(`/tracker/projects/${id}`, data)).data,

  deleteProject: async (id: string): Promise<{ success: boolean }> =>
    (await api.delete(`/tracker/projects/${id}`)).data,

  // Phases
  createPhase: async (projectId: string, data: { name: string; sortOrder?: number }): Promise<TrackerPhase> =>
    (await api.post(`/tracker/projects/${projectId}/phases`, data)).data,

  updatePhase: async (
    projectId: string,
    phaseId: string,
    data: Partial<{ name: string; sortOrder: number; isActive: boolean }>,
  ): Promise<TrackerPhase> =>
    (await api.patch(`/tracker/projects/${projectId}/phases/${phaseId}`, data)).data,

  deletePhase: async (projectId: string, phaseId: string): Promise<{ success: boolean }> =>
    (await api.delete(`/tracker/projects/${projectId}/phases/${phaseId}`)).data,

  // Types
  createType: async (projectId: string, data: { name: string; sortOrder?: number }): Promise<TrackerExpenseType> =>
    (await api.post(`/tracker/projects/${projectId}/types`, data)).data,

  updateType: async (
    projectId: string,
    typeId: string,
    data: Partial<{ name: string; sortOrder: number; isActive: boolean }>,
  ): Promise<TrackerExpenseType> =>
    (await api.patch(`/tracker/projects/${projectId}/types/${typeId}`, data)).data,

  deleteType: async (projectId: string, typeId: string): Promise<{ success: boolean }> =>
    (await api.delete(`/tracker/projects/${projectId}/types/${typeId}`)).data,

  // Tags
  createTag: async (
    projectId: string,
    data: { name: string; hexColor?: string; sortOrder?: number },
  ): Promise<TrackerTagItem> =>
    (await api.post(`/tracker/projects/${projectId}/tags`, data)).data,

  updateTag: async (
    projectId: string,
    tagId: string,
    data: Partial<{ name: string; hexColor: string; sortOrder: number; isActive: boolean }>,
  ): Promise<TrackerTagItem> =>
    (await api.patch(`/tracker/projects/${projectId}/tags/${tagId}`, data)).data,

  deleteTag: async (projectId: string, tagId: string): Promise<{ success: boolean }> =>
    (await api.delete(`/tracker/projects/${projectId}/tags/${tagId}`)).data,

  // Units
  getUnits: async (): Promise<TrackerUnit[]> =>
    (await api.get('/tracker/units')).data,

  createUnit: async (data: { name: string; sortOrder?: number }): Promise<TrackerUnit> =>
    (await api.post('/tracker/units', data)).data,

  // Expenses
  getExpenses: async (projectId: string, params?: ExpensesQueryParams): Promise<ExpensesResponse> =>
    (await api.get(`/tracker/projects/${projectId}/expenses`, { params })).data,

  getExpense: async (expenseId: string): Promise<TrackerExpense> =>
    (await api.get(`/tracker/expenses/${expenseId}`)).data,

  createExpense: async (
    projectId: string,
    data: {
      expenseTypeId?: string;
      productName?: string;
      brand?: string;
      description?: string;
      quantity: number | string;
      pricePerQty: number | string;
      totalCost?: number | string;
      unitId?: string;
      projectPhaseId?: string;
      tagItemId?: string;
      purchaseDate?: string;
      isException?: boolean;
    },
  ): Promise<TrackerExpense> =>
    (await api.post(`/tracker/projects/${projectId}/expenses`, data)).data,

  updateExpense: async (
    expenseId: string,
    data: Partial<{
      expenseTypeId: string;
      productName: string;
      brand: string;
      description: string;
      quantity: number | string;
      pricePerQty: number | string;
      totalCost: number | string;
      unitId: string;
      projectPhaseId: string;
      tagItemId: string;
      purchaseDate: string;
      isException: boolean;
    }>,
  ): Promise<TrackerExpense> =>
    (await api.patch(`/tracker/expenses/${expenseId}`, data)).data,

  deleteExpense: async (expenseId: string): Promise<{ success: boolean }> =>
    (await api.delete(`/tracker/expenses/${expenseId}`)).data,

  // Analytics
  getAnalytics: async (
    projectId: string,
    params?: { includeLabour?: boolean; phaseId?: string },
  ): Promise<TrackerAnalytics> =>
    (await api.get(`/tracker/projects/${projectId}/analytics`, { params })).data,
};
