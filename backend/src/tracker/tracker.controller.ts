import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TrackerService } from './tracker.service';
import { ProjectFundingService } from './project-funding.service';
import { SetLoanAllocationsDto } from './dto/set-loan-allocations.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActiveMemberGuard } from '../common/guards/active-member.guard';
import { FamilyScopeGuard } from '../common/guards/family-scope.guard';
import { FamilyScoped } from '../common/decorators/family-scoped.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, ActiveMemberGuard, FamilyScopeGuard)
@FamilyScoped()
@Controller('api/v1/tracker')
export class TrackerController {
  constructor(
    private readonly trackerService: TrackerService,
    private readonly fundingService: ProjectFundingService,
  ) {}

  // ─── Projects ─────────────────────────────────────────────────────────────

  @Get('projects')
  async getProjects(@CurrentUser() user: any) {
    return this.trackerService.getProjects(user.familyId);
  }

  @Post('projects')
  async createProject(@CurrentUser() user: any, @Body() dto: any) {
    return this.trackerService.createProject(user.familyId, user.sub, dto);
  }

  @Get('projects/:id')
  async getProject(@CurrentUser() user: any, @Param('id') id: string) {
    return this.trackerService.getProject(user.familyId, id);
  }

  @Patch('projects/:id')
  async updateProject(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.trackerService.updateProject(user.familyId, id, dto);
  }

  @Delete('projects/:id')
  async deleteProject(@CurrentUser() user: any, @Param('id') id: string) {
    return this.trackerService.deleteProject(user.familyId, id);
  }

  // ─── Funding, returns & loan allocations ──────────────────────────────────

  @Get('projects/:id/funding-returns')
  async getFundingReturns(@CurrentUser() user: any, @Param('id') id: string) {
    return this.fundingService.getFundingReturns(user.familyId, id);
  }

  @Get('loan-allocations')
  async listFamilyAllocations(@CurrentUser() user: any) {
    return this.fundingService.listFamilyAllocations(user.familyId);
  }

  @Get('loans/:loanId/allocations')
  async getLoanAllocations(@CurrentUser() user: any, @Param('loanId') loanId: string) {
    return this.fundingService.getLoanAllocations(user.familyId, loanId);
  }

  @Put('loans/:loanId/allocations')
  async setLoanAllocations(
    @CurrentUser() user: any,
    @Param('loanId') loanId: string,
    @Body() dto: SetLoanAllocationsDto,
  ) {
    return this.fundingService.setLoanAllocations(user.sub, user.familyId, loanId, dto);
  }

  // ─── Project Lookups (Phases, Types, Tags, Units) ─────────────────────────

  @Post('projects/:id/phases')
  async createPhase(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.trackerService.createPhase(user.familyId, id, dto);
  }

  @Patch('projects/:id/phases/:phaseId')
  async updatePhase(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
    @Body() dto: any,
  ) {
    return this.trackerService.updatePhase(user.familyId, id, phaseId, dto);
  }

  @Delete('projects/:id/phases/:phaseId')
  async deletePhase(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
  ) {
    return this.trackerService.deletePhase(user.familyId, id, phaseId);
  }

  @Post('projects/:id/types')
  async createType(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.trackerService.createType(user.familyId, id, dto);
  }

  @Patch('projects/:id/types/:typeId')
  async updateType(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('typeId') typeId: string,
    @Body() dto: any,
  ) {
    return this.trackerService.updateType(user.familyId, id, typeId, dto);
  }

  @Delete('projects/:id/types/:typeId')
  async deleteType(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('typeId') typeId: string,
  ) {
    return this.trackerService.deleteType(user.familyId, id, typeId);
  }

  @Post('projects/:id/tags')
  async createTag(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.trackerService.createTag(user.familyId, id, dto);
  }

  @Patch('projects/:id/tags/:tagId')
  async updateTag(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('tagId') tagId: string,
    @Body() dto: any,
  ) {
    return this.trackerService.updateTag(user.familyId, id, tagId, dto);
  }

  @Delete('projects/:id/tags/:tagId')
  async deleteTag(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('tagId') tagId: string,
  ) {
    return this.trackerService.deleteTag(user.familyId, id, tagId);
  }

  @Get('units')
  async getUnits() {
    return this.trackerService.getUnits();
  }

  @Post('units')
  async createUnit(@Body() dto: any) {
    return this.trackerService.createUnit(dto);
  }

  // ─── Expenses ─────────────────────────────────────────────────────────────

  @Get('projects/:id/expenses')
  async getExpenses(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('phaseId') phaseId?: string,
    @Query('tagId') tagId?: string,
    @Query('typeId') typeId?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.trackerService.getExpenses(user.familyId, id, {
      phaseId,
      tagId,
      typeId,
      search,
      page,
      limit,
    });
  }

  @Post('projects/:id/expenses')
  async createExpense(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.trackerService.createExpense(user.familyId, user.sub, id, dto);
  }

  @Get('expenses/:expenseId')
  async getExpense(
    @CurrentUser() user: any,
    @Param('expenseId') expenseId: string,
  ) {
    return this.trackerService.getExpense(user.familyId, expenseId);
  }

  @Patch('expenses/:expenseId')
  async updateExpense(
    @CurrentUser() user: any,
    @Param('expenseId') expenseId: string,
    @Body() dto: any,
  ) {
    return this.trackerService.updateExpense(user.familyId, expenseId, dto);
  }

  @Delete('expenses/:expenseId')
  async deleteExpense(
    @CurrentUser() user: any,
    @Param('expenseId') expenseId: string,
  ) {
    return this.trackerService.deleteExpense(user.familyId, expenseId);
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  @Get('projects/:id/analytics')
  async getAnalytics(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('includeLabour') includeLabour?: string,
    @Query('phaseId') phaseId?: string,
  ) {
    return this.trackerService.getAnalytics(user.familyId, id, {
      includeLabour: includeLabour === 'false' ? false : true,
      phaseId,
    });
  }
}
