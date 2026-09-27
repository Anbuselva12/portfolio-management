import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { IncomeService } from './income.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActiveMemberGuard } from '../common/guards/active-member.guard';
import { FamilyScopeGuard } from '../common/guards/family-scope.guard';
import { FamilyScoped } from '../common/decorators/family-scoped.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { StopIncomeDto } from './dto/stop-income.dto';

@UseGuards(JwtAuthGuard, ActiveMemberGuard, FamilyScopeGuard)
@FamilyScoped()
@Controller('api/v1/income')
export class IncomeController {
  constructor(private readonly incomeService: IncomeService) {}

  @Get()
  async getIncomes(@CurrentUser() user: any) {
    return this.incomeService.getIncomes(user.familyId);
  }

  @Post()
  async createIncome(@CurrentUser() user: any, @Body() dto: CreateIncomeDto) {
    return this.incomeService.createIncome(user.sub, user.familyId, dto);
  }

  @Patch(':id')
  async updateIncome(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateIncomeDto) {
    return this.incomeService.updateIncome(user.sub, user.familyId, id, dto);
  }

  @Delete(':id')
  async deleteIncome(@CurrentUser() user: any, @Param('id') id: string) {
    return this.incomeService.deleteIncome(user.sub, user.familyId, id);
  }

  @Post(':id/stop')
  async stopIncome(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: StopIncomeDto) {
    return this.incomeService.stopIncome(user.sub, user.familyId, id, dto);
  }

  @Post(':id/confirm-receipt/:yearMonth')
  async confirmReceipt(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('yearMonth') yearMonth: string,
    @Body() dto: any,
  ) {
    return this.incomeService.confirmReceipt(user.sub, user.familyId, id, yearMonth, dto);
  }
}
