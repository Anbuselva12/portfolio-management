import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActiveMemberGuard } from '../common/guards/active-member.guard';
import { FamilyScopeGuard } from '../common/guards/family-scope.guard';
import { FamilyScoped } from '../common/decorators/family-scoped.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, ActiveMemberGuard, FamilyScopeGuard)
@FamilyScoped()
@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(
    @CurrentUser() user: any,
    @Query('scope') scope: string,
  ) {
    const memberId = scope === 'me' ? user.sub : null;
    return this.dashboardService.getSummary(user.familyId, memberId);
  }

  @Get('analytics')
  async getAnalytics(
    @CurrentUser() user: any,
    @Query('scope') scope: string,
  ) {
    const memberId = scope === 'me' ? user.sub : null;
    return this.dashboardService.getAnalytics(user.familyId, memberId);
  }

  @Get('reminders')
  async getReminders(
    @CurrentUser() user: any,
    @Query('scope') scope: string,
  ) {
    const memberId = scope === 'me' ? user.sub : null;
    return this.dashboardService.getReminders(user.familyId, memberId);
  }
}
