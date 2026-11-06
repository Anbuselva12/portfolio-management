import { Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../common/prisma/prisma.module';
import { PrismaService } from '../common/prisma/prisma.service';

import {
  I_FAMILY_REPOSITORY,
  I_MEMBER_REPOSITORY,
  I_ASSET_REPOSITORY,
  I_INCOME_REPOSITORY,
  I_EXPENSE_CATEGORY_REPOSITORY,
  I_EXPENSE_REPOSITORY,
  I_INSURANCE_POLICY_REPOSITORY,
  I_LOAN_REPOSITORY,
  I_REPAYMENT_SCHEDULE_REPOSITORY,
  I_PREPAYMENT_REPOSITORY,
  I_AUDIT_REPOSITORY,
  I_CURRENCY_RATE_REPOSITORY,
  I_SUGGESTION_SNAPSHOT_REPOSITORY,
  I_RATE_REVISION_REPOSITORY,
  I_TRACKER_REPOSITORY,
} from './interfaces';

import {
  PrismaFamilyRepository,
  PrismaMemberRepository,
  PrismaAssetRepository,
  PrismaIncomeRepository,
  PrismaExpenseCategoryRepository,
  PrismaExpenseRepository,
  PrismaInsurancePolicyRepository,
  PrismaLoanRepository,
  PrismaRepaymentScheduleRepository,
  PrismaPrepaymentRepository,
  PrismaAuditRepository,
  PrismaCurrencyRateRepository,
  PrismaSuggestionSnapshotRepository,
  PrismaRateRevisionRepository,
  PrismaTrackerRepository,
} from './prisma';

import {
  LocalStorageFamilyRepository,
  LocalStorageMemberRepository,
  LocalStorageAssetRepository,
  LocalStorageIncomeRepository,
  LocalStorageExpenseCategoryRepository,
  LocalStorageExpenseRepository,
  LocalStorageInsurancePolicyRepository,
  LocalStorageLoanRepository,
  LocalStorageRepaymentScheduleRepository,
  LocalStoragePrepaymentRepository,
  LocalStorageAuditRepository,
  LocalStorageCurrencyRateRepository,
  LocalStorageSuggestionSnapshotRepository,
  LocalStorageRateRevisionRepository,
  LocalStorageTrackerRepository,
} from './local-storage';

const createRepoProvider = (token: string, PrismaRepo: any, LocalRepo: any): Provider => ({
  provide: token,
  inject: [ConfigService, PrismaService],
  useFactory: (config: ConfigService, prisma: PrismaService) => {
    const isLocal = config.get<string>('storageMode') === 'local';
    return isLocal ? new LocalRepo() : new PrismaRepo(prisma);
  },
});

const providers: Provider[] = [
  createRepoProvider(I_FAMILY_REPOSITORY, PrismaFamilyRepository, LocalStorageFamilyRepository),
  createRepoProvider(I_MEMBER_REPOSITORY, PrismaMemberRepository, LocalStorageMemberRepository),
  createRepoProvider(I_ASSET_REPOSITORY, PrismaAssetRepository, LocalStorageAssetRepository),
  createRepoProvider(I_INCOME_REPOSITORY, PrismaIncomeRepository, LocalStorageIncomeRepository),
  createRepoProvider(I_EXPENSE_CATEGORY_REPOSITORY, PrismaExpenseCategoryRepository, LocalStorageExpenseCategoryRepository),
  createRepoProvider(I_EXPENSE_REPOSITORY, PrismaExpenseRepository, LocalStorageExpenseRepository),
  createRepoProvider(I_INSURANCE_POLICY_REPOSITORY, PrismaInsurancePolicyRepository, LocalStorageInsurancePolicyRepository),
  createRepoProvider(I_LOAN_REPOSITORY, PrismaLoanRepository, LocalStorageLoanRepository),
  createRepoProvider(I_REPAYMENT_SCHEDULE_REPOSITORY, PrismaRepaymentScheduleRepository, LocalStorageRepaymentScheduleRepository),
  createRepoProvider(I_PREPAYMENT_REPOSITORY, PrismaPrepaymentRepository, LocalStoragePrepaymentRepository),
  createRepoProvider(I_AUDIT_REPOSITORY, PrismaAuditRepository, LocalStorageAuditRepository),
  createRepoProvider(I_CURRENCY_RATE_REPOSITORY, PrismaCurrencyRateRepository, LocalStorageCurrencyRateRepository),
  createRepoProvider(I_SUGGESTION_SNAPSHOT_REPOSITORY, PrismaSuggestionSnapshotRepository, LocalStorageSuggestionSnapshotRepository),
  createRepoProvider(I_RATE_REVISION_REPOSITORY, PrismaRateRevisionRepository, LocalStorageRateRevisionRepository),
  createRepoProvider(I_TRACKER_REPOSITORY, PrismaTrackerRepository, LocalStorageTrackerRepository),
];

@Global()
@Module({
  imports: [PrismaModule],
  providers,
  exports: providers,
})
export class RepositoriesModule {}
