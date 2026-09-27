import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { I_EXPENSE_REPOSITORY, IExpenseRepository, I_EXPENSE_CATEGORY_REPOSITORY, IExpenseCategoryRepository, I_AUDIT_REPOSITORY, IAuditRepository, I_REPAYMENT_SCHEDULE_REPOSITORY, IRepaymentScheduleRepository, I_LOAN_REPOSITORY, ILoanRepository } from '../repositories/interfaces';
import { Decimal } from 'decimal.js';
import { diffObjects } from '../common/utils/audit.util';

@Injectable()
export class ExpensesService {
  constructor(
    @Inject(I_EXPENSE_REPOSITORY) private readonly expenseRepository: IExpenseRepository,
    @Inject(I_EXPENSE_CATEGORY_REPOSITORY) private readonly categoryRepository: IExpenseCategoryRepository,
    @Inject(I_AUDIT_REPOSITORY) private readonly auditRepository: IAuditRepository,
    @Inject(I_REPAYMENT_SCHEDULE_REPOSITORY) private readonly scheduleRepository: IRepaymentScheduleRepository,
    @Inject(I_LOAN_REPOSITORY) private readonly loanRepository: ILoanRepository,
  ) {}

  async getCategories(familyId: string) {
    return this.categoryRepository.findByFamilyId(familyId);
  }

  async createCategory(memberId: string, familyId: string, dto: any) {
    const category = await this.categoryRepository.create({
      family_id: familyId,
      name: dto.name,
      icon: dto.icon || null,
      color: dto.color || null,
      is_active: true,
    });

    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'expenseCategory',
      entity_id: category.id,
      action: 'create',
    });

    return category;
  }

  async updateCategory(memberId: string, familyId: string, id: string, dto: any) {
    const existing = await this.categoryRepository.findById(id);
    if (!existing || existing.family_id !== familyId) throw new NotFoundException('Category not found');

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;

    const updated = await this.categoryRepository.update(id, updateData);

    const diff = diffObjects(existing, updated);
    if (diff !== '{}') {
      await this.auditRepository.create({
        member_id: memberId,
        family_id: familyId,
        entity_type: 'expenseCategory',
        entity_id: id,
        action: 'update',
        field_changes: diff,
      });
    }

    return updated;
  }

  async getExpenses(familyId: string, year: number, month: number) {
    // Lazy EMI auto-queue: create expense entries for loan EMIs due this month
    await this.autoQueueLoanEmis(familyId, year, month);

    const expenses = await this.expenseRepository.findByMonth(familyId, year, month);
    return expenses.map(e => ({ ...e, amount: e.amount.toString() }));
  }

  /**
   * Lazily create loan EMI expense entries for a given month.
   * Excludes gold/jewel loans. Only runs for loans with emi_reminders_enabled = true.
   * Idempotent: skips installments already linked to an expense.
   */
  private async autoQueueLoanEmis(familyId: string, year: number, month: number) {
    const loans = await this.loanRepository.findByFamilyId(familyId);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    for (const loan of loans) {
      // Skip inactive loans
      if (loan.status !== 'active') continue;
      // Skip gold/jewel loans (simple interest bullet repayment)
      if ((loan.type as string) === 'jewel' || (loan.type as string) === 'gold') continue;
      // Skip if reminders disabled
      if (!(loan as any).emi_reminders_enabled) continue;

      const schedule = await this.scheduleRepository.findByLoanId(loan.id);
      // Find installments due this month
      const dueThisMonth = schedule.filter((inst) => {
        const due = new Date(inst.due_date);
        return due >= monthStart && due <= monthEnd;
      });

      for (const inst of dueThisMonth) {
        // Check if expense already exists for this installment
        const existing = await this.expenseRepository.findByInstallmentId(inst.id);
        if (existing.length > 0) continue;

        // Find or create 'Loans & EMI' category for this family
        const categories = await this.categoryRepository.findByFamilyId(familyId);
        let emiCategory = categories.find(c => c.name.toLowerCase().includes('loan') || c.name.toLowerCase().includes('emi'));
        if (!emiCategory) {
          emiCategory = await this.categoryRepository.create({
            family_id: familyId,
            name: 'Loans & EMI',
            icon: 'credit-card',
            color: '#e11d48',
            is_active: true,
          });
        }

        // Create the auto-queued expense entry
        await this.expenseRepository.create({
          member_id: loan.member_id,
          family_id: familyId,
          category_id: emiCategory.id,
          amount: new Decimal(inst.emi_amount.toString()),
          currency: loan.currency || 'INR',
          date: new Date(inst.due_date),
          notes: `Auto: ${(loan as any).name || loan.lender} EMI #${inst.installment_number}`,
          source: 'loan_emi_auto',
          loan_id: loan.id,
          installment_id: inst.id,
          is_paid: inst.is_paid,
        });
      }
    }
  }

  async createExpense(memberId: string, familyId: string, dto: any) {
    const expense = await this.expenseRepository.create({
      member_id: memberId,
      family_id: familyId,
      category_id: dto.categoryId,
      amount: new Decimal(dto.amount),
      currency: dto.currency,
      date: new Date(dto.date),
      notes: dto.notes || null,
      source: dto.source || 'manual',
    });

    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'expense',
      entity_id: expense.id,
      action: 'create',
    });

    return { ...expense, amount: expense.amount.toString() };
  }

  async updateExpense(memberId: string, familyId: string, id: string, dto: any) {
    const existing = await this.expenseRepository.findById(id);
    if (!existing || existing.family_id !== familyId) throw new NotFoundException('Expense not found');

    const updateData: any = {};
    if (dto.categoryId !== undefined) updateData.category_id = dto.categoryId;
    if (dto.amount !== undefined) updateData.amount = new Decimal(dto.amount);
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.date !== undefined) updateData.date = new Date(dto.date);
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const updated = await this.expenseRepository.update(id, updateData);

    const diff = diffObjects(existing, updated);
    if (diff !== '{}') {
      await this.auditRepository.create({
        member_id: memberId,
        family_id: familyId,
        entity_type: 'expense',
        entity_id: id,
        action: 'update',
        field_changes: diff,
      });
    }

    return { ...updated, amount: updated.amount.toString() };
  }

  async deleteExpense(memberId: string, familyId: string, id: string) {
    const existing = await this.expenseRepository.findById(id);
    if (!existing || existing.family_id !== familyId) throw new NotFoundException('Expense not found');

    await this.expenseRepository.softDelete(id);

    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'expense',
      entity_id: id,
      action: 'delete',
    });

    return { message: 'Expense deleted' };
  }

  /**
   * Mark an auto-queued loan EMI expense as paid or unpaid.
   * Bi-directionally syncs the linked repayment installment's is_paid flag.
   */
  async markEmiPaid(memberId: string, familyId: string, expenseId: string, isPaid: boolean) {
    const expense = await this.expenseRepository.findById(expenseId);
    if (!expense || expense.family_id !== familyId) {
      throw new NotFoundException('Expense not found');
    }

    await this.expenseRepository.update(expenseId, { is_paid: isPaid } as any);

    // Bi-directional sync: mark the linked installment paid/unpaid
    if (expense.installment_id) {
      await this.scheduleRepository.update(expense.installment_id, {
        is_paid: isPaid,
        paid_date: isPaid ? new Date() : null,
      } as any);
    }

    return { ok: true, expenseId, isPaid };
  }
}
