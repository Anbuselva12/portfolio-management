import {
  FairShareTrip,
  FairShareHousehold,
  FairShareParticipant,
  FairShareExpense,
  FairShareExpenseSplit,
  FairShareSettlement,
} from '@prisma/client';

export type TripWithDetails = FairShareTrip & {
  creator?: { id: string; display_name: string; username: string };
  households: (FairShareHousehold & {
    participants: FairShareParticipant[];
  })[];
  participants: (FairShareParticipant & {
    household?: FairShareHousehold | null;
  })[];
  expenses: (FairShareExpense & {
    payer: FairShareParticipant;
    splits: (FairShareExpenseSplit & {
      participant: FairShareParticipant;
      household?: FairShareHousehold | null;
    })[];
  })[];
  settlements: FairShareSettlement[];
};

export interface IFairShareRepository {
  // Trips
  findTripsByMemberId(memberId: string): Promise<FairShareTrip[]>;
  findTripById(id: string): Promise<TripWithDetails | null>;
  createTrip(data: any): Promise<FairShareTrip>;
  updateTrip(id: string, data: Partial<FairShareTrip>): Promise<FairShareTrip>;
  deleteTrip(id: string): Promise<void>;

  // Households
  findHouseholdsByTripId(tripId: string): Promise<FairShareHousehold[]>;
  createHousehold(data: any): Promise<FairShareHousehold>;
  updateHousehold(id: string, data: Partial<FairShareHousehold>): Promise<FairShareHousehold>;
  deleteHousehold(id: string): Promise<void>;

  // Participants
  findParticipantsByTripId(tripId: string): Promise<FairShareParticipant[]>;
  createParticipant(data: any): Promise<FairShareParticipant>;
  updateParticipant(id: string, data: Partial<FairShareParticipant>): Promise<FairShareParticipant>;
  deleteParticipant(id: string): Promise<void>;

  // Expenses
  findExpensesByTripId(tripId: string): Promise<FairShareExpense[]>;
  findExpenseById(id: string): Promise<FairShareExpense | null>;
  createExpense(data: any, splits: any[]): Promise<FairShareExpense>;
  updateExpense(id: string, data: any, splits?: any[]): Promise<FairShareExpense>;
  deleteExpense(id: string): Promise<void>;

  // Settlements
  findSettlementsByTripId(tripId: string): Promise<FairShareSettlement[]>;
  createSettlement(data: any): Promise<FairShareSettlement>;
  deleteSettlement(id: string): Promise<void>;
}

export const I_FAIR_SHARE_REPOSITORY = 'IFairShareRepository';

