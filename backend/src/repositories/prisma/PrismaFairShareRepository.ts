import { Injectable } from '@nestjs/common';
import {
  FairShareTrip,
  FairShareHousehold,
  FairShareParticipant,
  FairShareExpense,
  FairShareSettlement,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IFairShareRepository, TripWithDetails } from '../interfaces';

@Injectable()
export class PrismaFairShareRepository implements IFairShareRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Trips ──────────────────────────────────────────────────────────────────

  async findTripsByMemberId(memberId: string): Promise<FairShareTrip[]> {
    return this.prisma.fairShareTrip.findMany({
      where: {
        OR: [
          { created_by_id: memberId },
          { participants: { some: { member_id: memberId } } },
        ],
      },
      orderBy: { created_at: 'desc' },
      include: {
        households: {
          include: { participants: true },
        },
        participants: true,
        expenses: {
          where: { is_active: true },
        },
      },
    });
  }

  async findTripById(id: string): Promise<TripWithDetails | null> {
    return this.prisma.fairShareTrip.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, display_name: true, username: true },
        },
        households: {
          orderBy: { sort_order: 'asc' },
          include: {
            participants: true,
          },
        },
        participants: {
          orderBy: { created_at: 'asc' },
          include: {
            household: true,
          },
        },
        expenses: {
          where: { is_active: true },
          orderBy: [{ expense_date: 'desc' }, { created_at: 'desc' }],
          include: {
            payer: true,
            splits: {
              include: {
                participant: true,
                household: true,
              },
            },
          },
        },
        settlements: {
          orderBy: { settled_at: 'desc' },
        },
      },
    }) as Promise<TripWithDetails | null>;
  }

  async createTrip(data: any): Promise<FairShareTrip> {
    return this.prisma.fairShareTrip.create({
      data,
    });
  }

  async updateTrip(id: string, data: Partial<FairShareTrip>): Promise<FairShareTrip> {
    return this.prisma.fairShareTrip.update({
      where: { id },
      data,
    });
  }

  async deleteTrip(id: string): Promise<void> {
    await this.prisma.fairShareTrip.delete({
      where: { id },
    });
  }

  // ─── Households ─────────────────────────────────────────────────────────────

  async findHouseholdsByTripId(tripId: string): Promise<FairShareHousehold[]> {
    return this.prisma.fairShareHousehold.findMany({
      where: { trip_id: tripId },
      orderBy: { sort_order: 'asc' },
      include: { participants: true },
    });
  }

  async createHousehold(data: any): Promise<FairShareHousehold> {
    return this.prisma.fairShareHousehold.create({
      data,
    });
  }

  async updateHousehold(id: string, data: Partial<FairShareHousehold>): Promise<FairShareHousehold> {
    return this.prisma.fairShareHousehold.update({
      where: { id },
      data,
    });
  }

  async deleteHousehold(id: string): Promise<void> {
    await this.prisma.fairShareHousehold.delete({
      where: { id },
    });
  }

  // ─── Participants ───────────────────────────────────────────────────────────

  async findParticipantsByTripId(tripId: string): Promise<FairShareParticipant[]> {
    return this.prisma.fairShareParticipant.findMany({
      where: { trip_id: tripId },
      orderBy: { created_at: 'asc' },
      include: { household: true },
    });
  }

  async createParticipant(data: any): Promise<FairShareParticipant> {
    return this.prisma.fairShareParticipant.create({
      data,
    });
  }

  async updateParticipant(id: string, data: Partial<FairShareParticipant>): Promise<FairShareParticipant> {
    return this.prisma.fairShareParticipant.update({
      where: { id },
      data,
    });
  }

  async deleteParticipant(id: string): Promise<void> {
    await this.prisma.fairShareParticipant.delete({
      where: { id },
    });
  }

  // ─── Expenses ───────────────────────────────────────────────────────────────

  async findExpensesByTripId(tripId: string): Promise<FairShareExpense[]> {
    return this.prisma.fairShareExpense.findMany({
      where: { trip_id: tripId, is_active: true },
      orderBy: [{ expense_date: 'desc' }, { created_at: 'desc' }],
      include: {
        payer: true,
        splits: {
          include: {
            participant: true,
            household: true,
          },
        },
      },
    });
  }

  async findExpenseById(id: string): Promise<FairShareExpense | null> {
    return this.prisma.fairShareExpense.findUnique({
      where: { id },
      include: {
        payer: true,
        splits: {
          include: {
            participant: true,
            household: true,
          },
        },
      },
    });
  }

  async createExpense(data: any, splits: any[]): Promise<FairShareExpense> {
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.fairShareExpense.create({
        data,
      });

      if (splits && splits.length > 0) {
        await tx.fairShareExpenseSplit.createMany({
          data: splits.map((s) => ({
            ...s,
            expense_id: expense.id,
          })),
        });
      }

      return tx.fairShareExpense.findUnique({
        where: { id: expense.id },
        include: {
          payer: true,
          splits: {
            include: {
              participant: true,
              household: true,
            },
          },
        },
      }) as unknown as FairShareExpense;
    });
  }

  async updateExpense(id: string, data: any, splits?: any[]): Promise<FairShareExpense> {
    return this.prisma.$transaction(async (tx) => {
      await tx.fairShareExpense.update({
        where: { id },
        data,
      });

      if (splits) {
        await tx.fairShareExpenseSplit.deleteMany({
          where: { expense_id: id },
        });

        if (splits.length > 0) {
          await tx.fairShareExpenseSplit.createMany({
            data: splits.map((s) => ({
              ...s,
              expense_id: id,
            })),
          });
        }
      }

      return tx.fairShareExpense.findUnique({
        where: { id },
        include: {
          payer: true,
          splits: {
            include: {
              participant: true,
              household: true,
            },
          },
        },
      }) as unknown as FairShareExpense;
    });
  }

  async deleteExpense(id: string): Promise<void> {
    await this.prisma.fairShareExpense.update({
      where: { id },
      data: { is_active: false },
    });
  }

  // ─── Settlements ────────────────────────────────────────────────────────────

  async findSettlementsByTripId(tripId: string): Promise<FairShareSettlement[]> {
    return this.prisma.fairShareSettlement.findMany({
      where: { trip_id: tripId },
      orderBy: { settled_at: 'desc' },
    });
  }

  async createSettlement(data: any): Promise<FairShareSettlement> {
    return this.prisma.fairShareSettlement.create({
      data,
    });
  }

  async deleteSettlement(id: string): Promise<void> {
    await this.prisma.fairShareSettlement.delete({
      where: { id },
    });
  }
}

