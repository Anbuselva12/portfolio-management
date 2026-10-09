import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  IAuditRepository,
  I_AUDIT_REPOSITORY,
  IAssetRepository,
  I_ASSET_REPOSITORY,
  IIncomeRepository,
  I_INCOME_REPOSITORY,
  ILoanRepository,
  I_LOAN_REPOSITORY,
  IExpenseRepository,
  I_EXPENSE_REPOSITORY,
  IInsurancePolicyRepository,
  I_INSURANCE_POLICY_REPOSITORY,
} from '../repositories/interfaces';

@Injectable()
export class AuditService {
  constructor(
    @Inject(I_AUDIT_REPOSITORY) private readonly auditRepository: IAuditRepository,
    @Inject(I_ASSET_REPOSITORY) private readonly assetRepository: IAssetRepository,
    @Inject(I_INCOME_REPOSITORY) private readonly incomeRepository: IIncomeRepository,
    @Inject(I_LOAN_REPOSITORY) private readonly loanRepository: ILoanRepository,
    @Inject(I_EXPENSE_REPOSITORY) private readonly expenseRepository: IExpenseRepository,
    @Inject(I_INSURANCE_POLICY_REPOSITORY) private readonly insuranceRepository: IInsurancePolicyRepository,
  ) {}

  async getAuditLogs(familyId: string, memberId: string, role: string, query: any) {
    const filters: any = {};
    if (query.entityType) filters.entityType = query.entityType;
    if (query.action) filters.action = query.action;
    if (query.startDate) filters.startDate = this.parseDate(query.startDate, 'startDate');
    if (query.endDate) filters.endDate = this.parseDate(query.endDate, 'endDate');

    if (role === 'admin') {
      if (query.memberId) filters.memberId = query.memberId;
      return this.auditRepository.findByFamilyId(familyId, filters);
    } else {
      // Non-admins only see "My Activity"
      return this.auditRepository.findByMemberId(memberId, filters);
    }
  }

  private parseDate(value: unknown, field: string): Date {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return date;
  }

  async restoreEntity(familyId: string, memberId: string, role: string, entityType: string, entityId: string) {
    if (role !== 'admin') {
      throw new ForbiddenException('Only family administrators can restore deleted financial records.');
    }

    const type = entityType.toLowerCase();
    // Only records soft-deleted within the caller's own family may be restored (prevents cross-tenant IDOR).
    const familyLog = await this.auditRepository.findByFamilyId(familyId, { entityType: type, action: 'delete' });
    if (!familyLog.some((entry) => entry.entity_id === entityId)) {
      throw new NotFoundException(`Record of type ${entityType} not found.`);
    }

    let restoredItem: any = null;
    switch (entityType.toLowerCase()) {
      case 'asset':
        restoredItem = await this.assetRepository.restore(entityId);
        break;
      case 'income':
        restoredItem = await this.incomeRepository.restore(entityId);
        break;
      case 'loan':
        restoredItem = await this.loanRepository.restore(entityId);
        break;
      case 'expense':
        restoredItem = await this.expenseRepository.restore(entityId);
        break;
      case 'insurance':
        restoredItem = await this.insuranceRepository.restore(entityId);
        break;
      default:
        throw new BadRequestException(`Unsupported entity type: ${entityType}`);
    }

    if (!restoredItem) {
      throw new NotFoundException(`Record of type ${entityType} not found.`);
    }

    // Log the restore event itself
    await this.auditRepository.create({
      family_id: familyId,
      member_id: memberId,
      entity_type: entityType.toLowerCase(),
      entity_id: entityId,
      action: 'restore',
      field_changes: JSON.stringify({ deleted_at: { old: 'soft_deleted', new: null } }),
    });

    return {
      success: true,
      message: `${entityType.toUpperCase()} record successfully restored.`,
      restoredItem,
    };
  }
}

