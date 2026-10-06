import { api } from '../axios';
import {
  FairShareTrip,
  FairShareHousehold,
  FairShareParticipant,
  FairShareExpense,
  FairShareSettlement,
  FairShareTripAnalytics,
} from '../../types';

export const fairShareApi = {
  // Trips
  getTrips: async (): Promise<FairShareTrip[]> =>
    (await api.get('/fairshare/trips')).data,

  getTrip: async (id: string): Promise<FairShareTrip> =>
    (await api.get(`/fairshare/trips/${id}`)).data,

  createTrip: async (data: any): Promise<FairShareTrip> =>
    (await api.post('/fairshare/trips', data)).data,

  updateTrip: async (id: string, data: any): Promise<FairShareTrip> =>
    (await api.patch(`/fairshare/trips/${id}`, data)).data,

  deleteTrip: async (id: string): Promise<{ success: boolean }> =>
    (await api.delete(`/fairshare/trips/${id}`)).data,

  // Analytics & WhatsApp
  getTripAnalytics: async (id: string, rollup?: 'family' | 'individual'): Promise<FairShareTripAnalytics> =>
    (await api.get(`/fairshare/trips/${id}/analytics`, { params: { rollup } })).data,

  getWhatsAppSummary: async (id: string, rollup?: 'family' | 'individual'): Promise<{ text: string }> =>
    (await api.get(`/fairshare/trips/${id}/whatsapp`, { params: { rollup } })).data,

  // Households
  addHousehold: async (tripId: string, data: any): Promise<FairShareHousehold> =>
    (await api.post(`/fairshare/trips/${tripId}/households`, data)).data,

  updateHousehold: async (tripId: string, householdId: string, data: any): Promise<FairShareHousehold> =>
    (await api.patch(`/fairshare/trips/${tripId}/households/${householdId}`, data)).data,

  deleteHousehold: async (tripId: string, householdId: string): Promise<{ success: boolean }> =>
    (await api.delete(`/fairshare/trips/${tripId}/households/${householdId}`)).data,

  // Participants
  addParticipant: async (tripId: string, data: any): Promise<FairShareParticipant> =>
    (await api.post(`/fairshare/trips/${tripId}/participants`, data)).data,

  updateParticipant: async (tripId: string, participantId: string, data: any): Promise<FairShareParticipant> =>
    (await api.patch(`/fairshare/trips/${tripId}/participants/${participantId}`, data)).data,

  deleteParticipant: async (tripId: string, participantId: string): Promise<{ success: boolean }> =>
    (await api.delete(`/fairshare/trips/${tripId}/participants/${participantId}`)).data,

  // Expenses
  createExpense: async (tripId: string, data: any): Promise<FairShareExpense> =>
    (await api.post(`/fairshare/trips/${tripId}/expenses`, data)).data,

  updateExpense: async (tripId: string, expenseId: string, data: any): Promise<FairShareExpense> =>
    (await api.patch(`/fairshare/trips/${tripId}/expenses/${expenseId}`, data)).data,

  deleteExpense: async (tripId: string, expenseId: string): Promise<{ success: boolean }> =>
    (await api.delete(`/fairshare/trips/${tripId}/expenses/${expenseId}`)).data,

  // Settlements
  recordSettlement: async (tripId: string, data: any): Promise<FairShareSettlement> =>
    (await api.post(`/fairshare/trips/${tripId}/settlements`, data)).data,

  deleteSettlement: async (tripId: string, settlementId: string): Promise<{ success: boolean }> =>
    (await api.delete(`/fairshare/trips/${tripId}/settlements/${settlementId}`)).data,
};

