import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { I_INSURANCE_POLICY_REPOSITORY, IInsurancePolicyRepository, I_EXPENSE_REPOSITORY, IExpenseRepository, I_AUDIT_REPOSITORY, IAuditRepository } from '../repositories/interfaces';
import { PrismaService } from '../common/prisma/prisma.service';
import { Decimal } from 'decimal.js';
import { diffObjects } from '../common/utils/audit.util';

@Injectable()
export class InsuranceService {
  private readonly logger = new Logger(InsuranceService.name);

  constructor(
    @Inject(I_INSURANCE_POLICY_REPOSITORY) private readonly insuranceRepository: IInsurancePolicyRepository,
    @Inject(I_EXPENSE_REPOSITORY) private readonly expenseRepository: IExpenseRepository,
    @Inject(I_AUDIT_REPOSITORY) private readonly auditRepository: IAuditRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getPolicies(familyId: string) {
    const policies = await this.insuranceRepository.findByFamilyId(familyId);
    return policies.map(p => ({
      ...p,
      sum_assured: p.sum_assured.toString(),
      premium_amount: p.premium_amount.toString(),
    }));
  }

  async createPolicy(memberId: string, familyId: string, dto: any) {
    const policy = await this.insuranceRepository.create({
      member_id: memberId,
      family_id: familyId,
      policy_type: dto.policyType,
      provider: dto.provider,
      policy_number: dto.policyNumber,
      sum_assured: new Decimal(dto.sumAssured),
      premium_amount: new Decimal(dto.premiumAmount),
      premium_frequency: dto.premiumFrequency,
      next_due_date: new Date(dto.nextDueDate),
      linked_category_id: dto.linkedCategoryId || null,
      status: 'active',
    });

    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'insurance',
      entity_id: policy.id,
      action: 'create',
    });

    await this.checkAutoExpenseCreation(policy, memberId);

    return {
      ...policy,
      sum_assured: policy.sum_assured.toString(),
      premium_amount: policy.premium_amount.toString(),
    };
  }

  async updatePolicy(memberId: string, familyId: string, id: string, dto: any) {
    const existing = await this.insuranceRepository.findById(id);
    if (!existing || existing.family_id !== familyId) throw new NotFoundException('Policy not found');

    const updateData: any = {};
    if (dto.policyType !== undefined) updateData.policy_type = dto.policyType;
    if (dto.provider !== undefined) updateData.provider = dto.provider;
    if (dto.policyNumber !== undefined) updateData.policy_number = dto.policyNumber;
    if (dto.sumAssured !== undefined) updateData.sum_assured = new Decimal(dto.sumAssured);
    if (dto.premiumAmount !== undefined) updateData.premium_amount = new Decimal(dto.premiumAmount);
    if (dto.premiumFrequency !== undefined) updateData.premium_frequency = dto.premiumFrequency;
    if (dto.nextDueDate !== undefined) updateData.next_due_date = new Date(dto.nextDueDate);
    if (dto.linkedCategoryId !== undefined) updateData.linked_category_id = dto.linkedCategoryId;
    if (dto.status !== undefined) updateData.status = dto.status;

    const updated = await this.insuranceRepository.update(id, updateData);

    const diff = diffObjects(existing, updated);
    if (diff !== '{}') {
      await this.auditRepository.create({
        member_id: memberId,
        family_id: familyId,
        entity_type: 'insurance',
        entity_id: id,
        action: 'update',
        field_changes: diff,
      });
    }

    await this.checkAutoExpenseCreation(updated, memberId);

    return {
      ...updated,
      sum_assured: updated.sum_assured.toString(),
      premium_amount: updated.premium_amount.toString(),
    };
  }

  async deletePolicy(memberId: string, familyId: string, id: string) {
    const existing = await this.insuranceRepository.findById(id);
    if (!existing || existing.family_id !== familyId) throw new NotFoundException('Policy not found');

    await this.insuranceRepository.softDelete(id);

    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'insurance',
      entity_id: id,
      action: 'delete',
    });

    return { message: 'Policy deleted' };
  }

  private async checkAutoExpenseCreation(policy: any, memberId: string) {
    if (policy.status !== 'active' || !policy.linked_category_id) return;

    const today = new Date();
    const nextDue = new Date(policy.next_due_date);
    const timeDiff = nextDue.getTime() - today.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);

    if (daysDiff <= 30 && daysDiff >= -5) { // Within 30 days ahead, or missed recently
      // Check if expense already created for this exact date to prevent duplicates
      const existingExpense = await this.prisma.expenseEntry.findFirst({
        where: {
          family_id: policy.family_id,
          category_id: policy.linked_category_id,
          source: 'insurance_auto',
          amount: policy.premium_amount,
          date: nextDue,
        }
      });

      if (!existingExpense) {
        await this.expenseRepository.create({
          member_id: memberId || policy.member_id,
          family_id: policy.family_id,
          category_id: policy.linked_category_id,
          amount: policy.premium_amount,
          currency: 'INR', // Defaulting for auto, real impl might read from family
          date: nextDue,
          notes: `Auto-generated for policy ${policy.policy_number}`,
          source: 'insurance_auto',
        });
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyInsuranceCron() {
    this.logger.log('Running daily insurance cron...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const duePolicies = await this.prisma.insurancePolicy.findMany({
      where: {
        status: 'active',
        next_due_date: {
          lte: today,
        },
        deleted_at: null,
      },
    });

    for (const policy of duePolicies) {
      if (policy.linked_category_id) {
        await this.expenseRepository.create({
          member_id: policy.member_id,
          family_id: policy.family_id,
          category_id: policy.linked_category_id,
          amount: policy.premium_amount,
          currency: 'INR',
          date: policy.next_due_date,
          notes: `Auto-generated for policy ${policy.policy_number}`,
          source: 'insurance_auto',
        });
      }

      // Advance next_due_date
      const newDate = new Date(policy.next_due_date);
      if (policy.premium_frequency === 'monthly') {
        newDate.setMonth(newDate.getMonth() + 1);
      } else if (policy.premium_frequency === 'quarterly') {
        newDate.setMonth(newDate.getMonth() + 3);
      } else if (policy.premium_frequency === 'annual') {
        newDate.setFullYear(newDate.getFullYear() + 1);
      }

      await this.insuranceRepository.update(policy.id, { next_due_date: newDate });
      this.logger.log(`Advanced policy ${policy.id} to ${newDate}`);
    }
  }
}
