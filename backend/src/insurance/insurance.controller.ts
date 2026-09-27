import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActiveMemberGuard } from '../common/guards/active-member.guard';
import { FamilyScopeGuard } from '../common/guards/family-scope.guard';
import { FamilyScoped } from '../common/decorators/family-scoped.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, ActiveMemberGuard, FamilyScopeGuard)
@FamilyScoped()
@Controller('api/v1/insurance')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Get()
  async getPolicies(@CurrentUser() user: any) {
    return this.insuranceService.getPolicies(user.familyId);
  }

  @Post()
  async createPolicy(@CurrentUser() user: any, @Body() dto: any) {
    return this.insuranceService.createPolicy(user.sub, user.familyId, dto);
  }

  @Patch(':id')
  async updatePolicy(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.insuranceService.updatePolicy(user.sub, user.familyId, id, dto);
  }

  @Delete(':id')
  async deletePolicy(@CurrentUser() user: any, @Param('id') id: string) {
    return this.insuranceService.deletePolicy(user.sub, user.familyId, id);
  }
}
