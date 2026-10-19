import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  I_INCOME_REPOSITORY,
  IIncomeRepository,
  I_AUDIT_REPOSITORY,
  IAuditRepository,
  I_TRACKER_REPOSITORY,
  ITrackerRepository,
} from '../repositories/interfaces';
import { Decimal } from 'decimal.js';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { StopIncomeDto } from './dto/stop-income.dto';
import { diffObjects } from '../common/utils/audit.util';

@Injectable()
export class IncomeService {
  constructor(
    @Inject(I_INCOME_REPOSITORY) private readonly incomeRepository: IIncomeRepository,
    @Inject(I_AUDIT_REPOSITORY) private readonly auditRepository: IAuditRepository,
    @Inject(I_TRACKER_REPOSITORY) private readonly trackerRepository: ITrackerRepository,
  ) {}

  /** Ensures the project exists, is active and belongs to the family; returns its id (or null for "no project"). */
  private async resolveProjectId(familyId: string, projectId: string | null | undefined): Promise<string | null> {
    if (!projectId) return null;
    const project = await this.trackerRepository.findProjectById(projectId);
    if (!project || project.family_id !== familyId || !project.is_active) {
      throw new BadRequestException('Project not found in your family');
    }
    return project.id;
  }

  /** Applies a project tag to every entry in the supersession chain so history and future revisions stay consistent. */
  private async tagChain(familyId: string, entry: { id: string }, projectId: string | null): Promise<void> {
    const all = await this.incomeRepository.findByFamilyId(familyId);
    const byId = new Map(all.map((i) => [i.id, i]));
    const chain = new Set<string>();
    const walk = (id: string) => {
      if (chain.has(id) || !byId.has(id)) return;
      chain.add(id);
      const current = byId.get(id)!;
      if (current.superseded_by_id) walk(current.superseded_by_id);
      all.filter((i) => i.superseded_by_id === id).forEach((i) => walk(i.id));
    };
    walk(entry.id);
    for (const id of chain) {
      await this.incomeRepository.update(id, { project_id: projectId });
    }
  }

  async getIncomes(familyId: string) {
    const incomes = await this.incomeRepository.findByFamilyId(familyId);
    return incomes.map(this.formatIncome);
  }

  async createIncome(memberId: string, familyId: string, dto: CreateIncomeDto) {
    const startDate = new Date(dto.startDate);
    const income = await this.incomeRepository.create({
      member_id: memberId,
      family_id: familyId,
      type: dto.type,
      label: dto.label,
      amount: new Decimal(dto.amount),
      currency: dto.currency,
      recurrence: dto.recurrence,
      reminders_enabled: dto.remindersEnabled !== undefined ? dto.remindersEnabled : true,
      due_day_of_month: dto.dueDayOfMonth || startDate.getDate(),
      start_date: startDate,
      end_date: dto.endDate ? new Date(dto.endDate) : null,
      status: 'active',
      last_amount_change_date: new Date(),
      project_id: await this.resolveProjectId(familyId, dto.projectId),
    });

    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'income',
      entity_id: income.id,
      action: 'create',
    });

    return this.formatIncome(income);
  }

  async updateIncome(memberId: string, familyId: string, id: string, dto: UpdateIncomeDto) {
    const existing = await this.incomeRepository.findById(id);
    if (!existing || existing.family_id !== familyId) throw new NotFoundException('Income entry not found');

    let projectIdAfter: string | null = existing.project_id;
    if (dto.projectId !== undefined) {
      projectIdAfter = await this.resolveProjectId(familyId, dto.projectId);
      if (projectIdAfter !== existing.project_id) {
        await this.tagChain(familyId, existing, projectIdAfter);
        await this.auditRepository.create({
          member_id: memberId,
          family_id: familyId,
          entity_type: 'income',
          entity_id: id,
          action: 'update',
          field_changes: JSON.stringify({ project_id: { old: existing.project_id, new: projectIdAfter } }),
        });
      }
    }

    if (existing.recurrence === 'recurring_monthly' && dto.amount && new Decimal(dto.amount).cmp(existing.amount) !== 0) {
      if (!dto.effectiveDate) {
        throw new BadRequestException('effectiveDate is required when modifying amount for recurring income');
      }

      const effectiveDate = new Date(dto.effectiveDate);
      const endDateForOld = new Date(effectiveDate);
      endDateForOld.setDate(endDateForOld.getDate() - 1);

      await this.incomeRepository.update(id, {
        end_date: endDateForOld,
        status: 'superseded',
      });

      const newIncome = await this.incomeRepository.create({
        member_id: existing.member_id,
        family_id: existing.family_id,
        type: dto.type || existing.type,
        label: dto.label || existing.label,
        amount: new Decimal(dto.amount),
        currency: dto.currency || existing.currency,
        recurrence: existing.recurrence,
        reminders_enabled: dto.remindersEnabled !== undefined ? dto.remindersEnabled : (existing as any).reminders_enabled,
        due_day_of_month: dto.dueDayOfMonth || (existing as any).due_day_of_month,
        start_date: effectiveDate,
        end_date: existing.end_date,
        status: 'active',
        superseded_by_id: existing.id,
        last_amount_change_date: effectiveDate,
        project_id: projectIdAfter,
      });

      await this.auditRepository.create({
        member_id: memberId,
        family_id: familyId,
        entity_type: 'income',
        entity_id: id,
        action: 'update',
        field_changes: JSON.stringify({ supersession: `Replaced by ${newIncome.id}` }),
      });

      return this.formatIncome(newIncome);
    } else {
      const updateData: any = {};
      if (dto.label) updateData.label = dto.label;
      if (dto.type) updateData.type = dto.type;
      if (dto.currency) updateData.currency = dto.currency;
      if (dto.amount) updateData.amount = new Decimal(dto.amount);
      if (dto.endDate) updateData.end_date = new Date(dto.endDate);
      if (dto.remindersEnabled !== undefined) updateData.reminders_enabled = dto.remindersEnabled;
      if (dto.dueDayOfMonth !== undefined) updateData.due_day_of_month = dto.dueDayOfMonth;

      const updated = await this.incomeRepository.update(id, updateData);
      // The project tag is audited separately above; keep it out of the generic field diff.
      const diff = diffObjects({ ...existing, project_id: projectIdAfter }, updated);
      if (diff !== '{}') {
        await this.auditRepository.create({
          member_id: memberId,
          family_id: familyId,
          entity_type: 'income',
          entity_id: id,
          action: 'update',
          field_changes: diff,
        });
      }
      return this.formatIncome(updated);
    }
  }

  async confirmReceipt(
    memberId: string,
    familyId: string,
    incomeId: string,
    yearMonth: string,
    dto: any,
  ) {
    const income = await this.incomeRepository.findById(incomeId);
    if (!income || income.family_id !== familyId) {
      throw new NotFoundException('Income entry not found');
    }

    const scheduledAmount = income.amount;
    const receivedAmount = new Decimal(dto.receivedAmount);

    const receipt = await this.incomeRepository.upsertReceipt({
      income_id: incomeId,
      family_id: familyId,
      member_id: memberId,
      year_month: yearMonth,
      scheduled_amount: scheduledAmount,
      received_amount: receivedAmount,
      status: 'received',
      received_date: dto.receivedDate ? new Date(dto.receivedDate) : new Date(),
      notes: dto.notes,
    });

    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'income_receipt',
      entity_id: receipt.id,
      action: 'create',
      field_changes: JSON.stringify({
        yearMonth,
        scheduled: scheduledAmount.toString(),
        received: receivedAmount.toString(),
        notes: dto.notes,
      }),
    });

    return receipt;
  }

  async stopIncome(memberId: string, familyId: string, id: string, dto: StopIncomeDto) {
    const existing = await this.incomeRepository.findById(id);
    if (!existing || existing.family_id !== familyId) throw new NotFoundException('Income entry not found');

    const updated = await this.incomeRepository.stop(id, new Date(dto.endDate));

    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'income',
      entity_id: id,
      action: 'update',
      field_changes: JSON.stringify({ status: { old: existing.status, new: 'stopped' }, end_date: { old: existing.end_date, new: dto.endDate } }),
    });

    return this.formatIncome(updated);
  }

  async deleteIncome(memberId: string, familyId: string, id: string) {
    const existing = await this.incomeRepository.findById(id);
    if (!existing || existing.family_id !== familyId) throw new NotFoundException('Income entry not found');

    await this.incomeRepository.softDelete(id);

    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'income',
      entity_id: id,
      action: 'delete',
    });

    return { message: 'Income entry deleted' };
  }

  private formatIncome(income: any) {
    return {
      ...income,
      amount: income.amount.toString(),
      reminders_enabled: income.reminders_enabled !== undefined ? income.reminders_enabled : true,
      due_day_of_month: income.due_day_of_month || 1,
    };
  }
}
