import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { LoansService } from './loans.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActiveMemberGuard } from '../common/guards/active-member.guard';
import { FamilyScopeGuard } from '../common/guards/family-scope.guard';
import { FamilyScoped } from '../common/decorators/family-scoped.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CreateLoanDto,
  UpdateLoanDto,
  PrepaymentPreviewDto,
  ApplyPrepaymentDto,
  UpdateInstallmentDto,
  RateRevisionDto,
  CalibrateLoanDto,
} from './dto';

@UseGuards(JwtAuthGuard, ActiveMemberGuard, FamilyScopeGuard)
@FamilyScoped()
@Controller('api/v1/loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get()
  async getLoans(@CurrentUser() user: any, @Query('memberId') memberId?: string) {
    return this.loansService.getLoans(user.familyId, memberId);
  }

  @Post()
  async createLoan(@CurrentUser() user: any, @Body() dto: CreateLoanDto) {
    return this.loansService.createLoan(user.sub, user.familyId, dto);
  }

  @Get(':id')
  async getLoan(@CurrentUser() user: any, @Param('id') id: string) {
    return this.loansService.getLoanById(id, user.familyId);
  }

  @Patch(':id')
  async updateLoan(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateLoanDto) {
    return this.loansService.updateLoan(id, user.familyId, user.sub, dto);
  }

  @Delete(':id')
  async deleteLoan(@CurrentUser() user: any, @Param('id') id: string) {
    return this.loansService.softDeleteLoan(id, user.familyId, user.sub);
  }

  @Get(':id/schedule')
  async getSchedule(@CurrentUser() user: any, @Param('id') id: string) {
    return this.loansService.getSchedule(id, user.familyId);
  }

  @Patch(':id/schedule/:installmentId')
  async updateInstallment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('installmentId') installmentId: string,
    @Body() dto: UpdateInstallmentDto,
  ) {
    return this.loansService.updateInstallment(id, installmentId, user.familyId, user.sub, dto);
  }

  @Get(':id/prepayments')
  async getPrepayments(@CurrentUser() user: any, @Param('id') id: string) {
    return this.loansService.getPrepayments(id, user.familyId);
  }

  @Get(':id/prepayments/broken-interest')
  async getBrokenInterest(@CurrentUser() user: any, @Param('id') id: string, @Query('date') date: string) {
    return this.loansService.calculateBrokenPeriodInterest(id, user.familyId, date);
  }

  @Post(':id/prepayments/preview')
  async previewPrepayment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: PrepaymentPreviewDto,
  ) {
    return this.loansService.previewPrepayment(id, user.familyId, dto);
  }

  @Post(':id/prepayments/apply')
  async applyPrepayment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ApplyPrepaymentDto,
  ) {
    return this.loansService.applyPrepayment(id, user.familyId, user.sub, dto);
  }

  @Get(':id/rate-revisions')
  async getRateRevisions(@CurrentUser() user: any, @Param('id') id: string) {
    return this.loansService.getRateRevisions(id, user.familyId);
  }

  @Post(':id/rate-revisions/preview')
  async previewRateRevision(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: RateRevisionDto,
  ) {
    return this.loansService.previewRateRevision(id, user.familyId, dto);
  }

  @Post(':id/rate-revisions/apply')
  async applyRateRevision(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: RateRevisionDto,
  ) {
    return this.loansService.applyRateRevision(id, user.familyId, user.sub, dto);
  }

  @Post(':id/calibrate')
  async calibrateLoan(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CalibrateLoanDto,
  ) {
    return this.loansService.calibrateLoan(id, user.familyId, user.sub, dto);
  }

  @Get(':id/ledger')
  async getGoldLoanLedger(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.loansService.getGoldLoanLedger(id, user.familyId, asOfDate);
  }

  @Post(':id/gold-payment')
  async addGoldLoanPayment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: { paymentDate: string; amount: string; notes?: string },
  ) {
    return this.loansService.addGoldLoanPayment(id, user.familyId, user.sub, dto);
  }
}

