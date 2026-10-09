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
  async getTrip(@CurrentUser() user: any, @Param('id') id: string) {
    await this.fairShareService.assertTripAccess(id, user.sub);
    return this.fairShareService.getTrip(id);
  }

  @Patch('trips/:id')
  async updateTrip(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    await this.fairShareService.assertTripAccess(id, user.sub);
    return this.fairShareService.updateTrip(id, dto);
  }

  @Delete('trips/:id')
  async deleteTrip(@CurrentUser() user: any, @Param('id') id: string) {
    await this.fairShareService.assertTripAccess(id, user.sub, true);
    await this.fairShareService.deleteTrip(id);
    return { success: true };
  }

  // ─── Analytics, Balances & WhatsApp ─────────────────────────────────────────

  @Get('trips/:id/analytics')
  async getTripAnalytics(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('rollup') rollup?: 'family' | 'individual',
  ) {
    await this.fairShareService.assertTripAccess(id, user.sub);
    return this.fairShareService.getTripAnalytics(id, rollup);
  }

  @Get('trips/:id/whatsapp')
  async getWhatsAppSummary(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('rollup') rollup?: 'family' | 'individual',
  ) {
    await this.fairShareService.assertTripAccess(id, user.sub);
    const text = await this.fairShareService.generateWhatsAppSummary(id, rollup);
    return { text };
  }

  // ─── Households ─────────────────────────────────────────────────────────────

  @Post('trips/:id/households')
  async addHousehold(@CurrentUser() user: any, @Param('id') tripId: string, @Body() dto: any) {
    await this.fairShareService.assertTripAccess(tripId, user.sub);
    return this.fairShareService.addHousehold(tripId, dto);
  }

  @Patch('trips/:id/households/:householdId')
  async updateHousehold(
    @CurrentUser() user: any,
    @Param('id') tripId: string,
    @Param('householdId') householdId: string,
    @Body() dto: any,
  ) {
    await this.fairShareService.assertTripAccess(tripId, user.sub);
    return this.fairShareService.updateHousehold(tripId, householdId, dto);
  }

  @Delete('trips/:id/households/:householdId')
  async deleteHousehold(
    @CurrentUser() user: any,
    @Param('id') tripId: string,
    @Param('householdId') householdId: string,
  ) {
    await this.fairShareService.assertTripAccess(tripId, user.sub);
    await this.fairShareService.deleteHousehold(tripId, householdId);
    return { success: true };
  }

  // ─── Participants ───────────────────────────────────────────────────────────

  @Post('trips/:id/participants')
  async addParticipant(@CurrentUser() user: any, @Param('id') tripId: string, @Body() dto: any) {
    await this.fairShareService.assertTripAccess(tripId, user.sub);
    return this.fairShareService.addParticipant(tripId, dto);
  }

  @Patch('trips/:id/participants/:participantId')
  async updateParticipant(
    @CurrentUser() user: any,
    @Param('id') tripId: string,
    @Param('participantId') participantId: string,
    @Body() dto: any,
  ) {
    await this.fairShareService.assertTripAccess(tripId, user.sub);
    return this.fairShareService.updateParticipant(tripId, participantId, dto);
  }

  @Delete('trips/:id/participants/:participantId')
  async deleteParticipant(
    @CurrentUser() user: any,
    @Param('id') tripId: string,
    @Param('participantId') participantId: string,
  ) {
    await this.fairShareService.assertTripAccess(tripId, user.sub);
    await this.fairShareService.deleteParticipant(tripId, participantId);
    return { success: true };
  }

  // ─── Expenses ───────────────────────────────────────────────────────────────

  @Post('trips/:id/expenses')
  async createExpense(@CurrentUser() user: any, @Param('id') tripId: string, @Body() dto: any) {
    await this.fairShareService.assertTripAccess(tripId, user.sub);
    return this.fairShareService.createExpense(tripId, dto);
  }

  @Patch('trips/:id/expenses/:expenseId')
  async updateExpense(
    @CurrentUser() user: any,
    @Param('id') tripId: string,
    @Param('expenseId') expenseId: string,
    @Body() dto: any,
  ) {
    await this.fairShareService.assertTripAccess(tripId, user.sub);
    return this.fairShareService.updateExpense(tripId, expenseId, dto);
  }

  @Delete('trips/:id/expenses/:expenseId')
  async deleteExpense(
    @CurrentUser() user: any,
    @Param('id') tripId: string,
    @Param('expenseId') expenseId: string,
  ) {
    await this.fairShareService.assertTripAccess(tripId, user.sub);
    await this.fairShareService.deleteExpense(tripId, expenseId);
    return { success: true };
  }

  // ─── Settlements ────────────────────────────────────────────────────────────

  @Post('trips/:id/settlements')
  async recordSettlement(@CurrentUser() user: any, @Param('id') tripId: string, @Body() dto: any) {
    await this.fairShareService.assertTripAccess(tripId, user.sub);
    return this.fairShareService.recordSettlement(tripId, dto);
  }

  @Delete('trips/:id/settlements/:settlementId')
  async deleteSettlement(
    @CurrentUser() user: any,
    @Param('id') tripId: string,
    @Param('settlementId') settlementId: string,
  ) {
    await this.fairShareService.assertTripAccess(tripId, user.sub);
    await this.fairShareService.deleteSettlement(tripId, settlementId);
    return { success: true };
  }
}

