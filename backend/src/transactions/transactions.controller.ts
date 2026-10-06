import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TransactionsService, TransactionsQueryDto } from './transactions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActiveMemberGuard } from '../common/guards/active-member.guard';
import { FamilyScopeGuard } from '../common/guards/family-scope.guard';
import { FamilyScoped } from '../common/decorators/family-scoped.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, ActiveMemberGuard, FamilyScopeGuard)
@FamilyScoped()
@Controller('api/v1/transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  async getTransactions(
    @CurrentUser() user: any,
    @Query() query: TransactionsQueryDto,
  ) {
    return this.transactionsService.getTransactions(user.familyId, query);
  }
}
