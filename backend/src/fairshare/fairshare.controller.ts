import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FairShareService } from './fairshare.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActiveMemberGuard } from '../common/guards/active-member.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, ActiveMemberGuard)
@Controller('api/v1/fairshare')
export class FairShareController {
  constructor(private readonly fairShareService: FairShareService) {}

  // ─── Trips ──────────────────────────────────────────────────────────────────

  @Get('trips')
  async getTrips(@CurrentUser() user: any) {
    return this.fairShareService.getTrips(user.sub);
  }

  @Post('trips')
  async createTrip(@CurrentUser() user: any, @Body() dto: any) {
    return this.fairShareService.createTrip(user.sub, dto);
  }

  @Get('trips/:id')
  async getTrip(@Param('id') id: string) {
    return this.fairShareService.getTrip(id);
  }

  @Patch('trips/:id')
  async updateTrip(@Param('id') id: string, @Body() dto: any) {
    return this.fairShareService.updateTrip(id, dto);
  }

  @Delete('trips/:id')
  async deleteTrip(@Param('id') id: string) {
    await this.fairShareService.deleteTrip(id);
    return { success: true };
  }

  // ─── Analytics, Balances & WhatsApp ─────────────────────────────────────────

  @Get('trips/:id/analytics')
  async getTripAnalytics(
    @Param('id') id: string,
    @Query('rollup') rollup?: 'family' | 'individual',
  ) {
    return this.fairShareService.getTripAnalytics(id, rollup);
  }

  @Get('trips/:id/whatsapp')
  async getWhatsAppSummary(
    @Param('id') id: string,
    @Query('rollup') rollup?: 'family' | 'individual',
  ) {
    const text = await this.fairShareService.generateWhatsAppSummary(id, rollup);
    return { text };
  }

  // ─── Households ─────────────────────────────────────────────────────────────

  @Post('trips/:id/households')
  async addHousehold(@Param('id') tripId: string, @Body() dto: any) {
    return this.fairShareService.addHousehold(tripId, dto);
  }

  @Patch('trips/:id/households/:householdId')
  async updateHousehold(
    @Param('id') tripId: string,
    @Param('householdId') householdId: string,
    @Body() dto: any,
  ) {
    return this.fairShareService.updateHousehold(tripId, householdId, dto);
  }

  @Delete('trips/:id/households/:householdId')
  async deleteHousehold(
    @Param('id') tripId: string,
    @Param('householdId') householdId: string,
  ) {
    await this.fairShareService.deleteHousehold(tripId, householdId);
    return { success: true };
  }

  // ─── Participants ───────────────────────────────────────────────────────────

  @Post('trips/:id/participants')
  async addParticipant(@Param('id') tripId: string, @Body() dto: any) {
    return this.fairShareService.addParticipant(tripId, dto);
  }

  @Patch('trips/:id/participants/:participantId')
  async updateParticipant(
    @Param('id') tripId: string,
    @Param('participantId') participantId: string,
    @Body() dto: any,
  ) {
    return this.fairShareService.updateParticipant(tripId, participantId, dto);
  }

  @Delete('trips/:id/participants/:participantId')
  async deleteParticipant(
    @Param('id') tripId: string,
    @Param('participantId') participantId: string,
  ) {
    await this.fairShareService.deleteParticipant(tripId, participantId);
    return { success: true };
  }

  // ─── Expenses ───────────────────────────────────────────────────────────────

  @Post('trips/:id/expenses')
  async createExpense(@Param('id') tripId: string, @Body() dto: any) {
    return this.fairShareService.createExpense(tripId, dto);
  }

  @Patch('trips/:id/expenses/:expenseId')
  async updateExpense(
    @Param('id') tripId: string,
    @Param('expenseId') expenseId: string,
    @Body() dto: any,
  ) {
    return this.fairShareService.updateExpense(tripId, expenseId, dto);
  }

  @Delete('trips/:id/expenses/:expenseId')
  async deleteExpense(
    @Param('id') tripId: string,
    @Param('expenseId') expenseId: string,
  ) {
    await this.fairShareService.deleteExpense(tripId, expenseId);
    return { success: true };
  }

  // ─── Settlements ────────────────────────────────────────────────────────────

  @Post('trips/:id/settlements')
  async recordSettlement(@Param('id') tripId: string, @Body() dto: any) {
    return this.fairShareService.recordSettlement(tripId, dto);
  }

  @Delete('trips/:id/settlements/:settlementId')
  async deleteSettlement(
    @Param('id') tripId: string,
    @Param('settlementId') settlementId: string,
  ) {
    await this.fairShareService.deleteSettlement(tripId, settlementId);
    return { success: true };
  }
}

