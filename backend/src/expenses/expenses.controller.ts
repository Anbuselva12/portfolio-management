import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActiveMemberGuard } from '../common/guards/active-member.guard';
import { FamilyScopeGuard } from '../common/guards/family-scope.guard';
import { FamilyScoped } from '../common/decorators/family-scoped.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, ActiveMemberGuard, FamilyScopeGuard)
@FamilyScoped()
@Controller('api/v1')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get('expense-categories')
  async getCategories(@CurrentUser() user: any) {
    return this.expensesService.getCategories(user.familyId);
  }

  @Post('expense-categories')
  async createCategory(@CurrentUser() user: any, @Body() dto: any) {
    return this.expensesService.createCategory(user.sub, user.familyId, dto);
  }

  @Patch('expense-categories/:id')
  async updateCategory(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.expensesService.updateCategory(user.sub, user.familyId, id, dto);
  }

  @Get('expenses')
  async getExpenses(@CurrentUser() user: any, @Query('month') monthStr: string) {
    let year, month;
    if (monthStr) {
      [year, month] = monthStr.split('-').map(Number);
    } else {
      const d = new Date();
      year = d.getFullYear();
      month = d.getMonth() + 1;
    }
    return this.expensesService.getExpenses(user.familyId, year, month);
  }

  @Post('expenses')
  async createExpense(@CurrentUser() user: any, @Body() dto: any) {
    return this.expensesService.createExpense(user.sub, user.familyId, dto);
  }

  @Patch('expenses/:id')
  async updateExpense(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.expensesService.updateExpense(user.sub, user.familyId, id, dto);
  }

  @Patch('expenses/:id/mark-paid')
  async markEmiPaid(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { isPaid: boolean }) {
    return this.expensesService.markEmiPaid(user.sub, user.familyId, id, body.isPaid);
  }

  @Delete('expenses/:id')
  async deleteExpense(@CurrentUser() user: any, @Param('id') id: string) {
    return this.expensesService.deleteExpense(user.sub, user.familyId, id);
  }
}
