import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { PrismaModule } from './common/prisma/prisma.module';
import { RepositoriesModule } from './repositories/RepositoriesModule';
import { AuthModule } from './auth/auth.module';
import { FamilyModule } from './family/family.module';
import { AdminModule } from './admin/admin.module';
import { AssetsModule } from './assets/assets.module';
import { IncomeModule } from './income/income.module';
import { ExpensesModule } from './expenses/expenses.module';
import { InsuranceModule } from './insurance/insurance.module';
import { LoansModule } from './loans/loans.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { StrategiesModule } from './strategies/strategies.module';
import { AuditModule } from './audit/audit.module';
import { TransactionsModule } from './transactions/transactions.module';
import { TrackerModule } from './tracker/tracker.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    RepositoriesModule,
    AuthModule,
    FamilyModule,
    AdminModule,
    AssetsModule,
    IncomeModule,
    ExpensesModule,
    InsuranceModule,
    LoansModule,
    DashboardModule,
    StrategiesModule,
    AuditModule,
    TransactionsModule,
    TrackerModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
