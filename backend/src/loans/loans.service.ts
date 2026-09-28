import { Injectable, Inject, Optional, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  I_LOAN_REPOSITORY,
  ILoanRepository,
  I_REPAYMENT_SCHEDULE_REPOSITORY,
  IRepaymentScheduleRepository,
  I_PREPAYMENT_REPOSITORY,
  IPrepaymentRepository,
  I_RATE_REVISION_REPOSITORY,
  IRateRevisionRepository,
  I_AUDIT_REPOSITORY,
  IAuditRepository,
  I_EXPENSE_REPOSITORY,
  IExpenseRepository,
} from '../repositories/interfaces';
import {
  CreateLoanDto,
  UpdateLoanDto,
  PrepaymentPreviewDto,
  ApplyPrepaymentDto,
  UpdateInstallmentDto,
  RateRevisionDto,
  CalibrateLoanDto,
} from './dto';
import { LoanEngine } from './engine/loan-engine';
import { GoldLoanCalculator } from './engine/gold-loan.calculator';
import Decimal from 'decimal.js';

@Injectable()
export class LoansService {
  constructor(
    @Inject(I_LOAN_REPOSITORY) private readonly loanRepository: ILoanRepository,
    @Inject(I_REPAYMENT_SCHEDULE_REPOSITORY) private readonly scheduleRepository: IRepaymentScheduleRepository,
    @Inject(I_PREPAYMENT_REPOSITORY) private readonly prepaymentRepository: IPrepaymentRepository,
    @Inject(I_RATE_REVISION_REPOSITORY) private readonly rateRevisionRepository: IRateRevisionRepository,
    @Inject(I_AUDIT_REPOSITORY) private readonly auditRepository: IAuditRepository,
    @Optional() @Inject(I_EXPENSE_REPOSITORY) private readonly expenseRepository?: IExpenseRepository,
  ) {}

  async createLoan(memberId: string, familyId: string, dto: CreateLoanDto) {
    const principal = new Decimal(dto.principal);
    const rate = new Decimal(dto.interestRate);
    const tenure = dto.tenureMonths;
    const userEmi = dto.userEmiInput ? new Decimal(dto.userEmiInput) : null;
    const interestType = dto.interestType || 'reducing_compound';
    const isGoldLoan = dto.type === 'jewel' || dto.type === 'gold';

    // 1. Reconcile EMI
    const reconciliation = LoanEngine.reconcileEmi(principal, rate, tenure, userEmi);
    let effectiveEmi = reconciliation.effectiveEmi;
    let hasDiscrepancy = reconciliation.hasDiscrepancy;

    if (isGoldLoan) {
      // For gold loans, default monthly servicing is monthly interest
      const monthlyServicing = principal.times(rate).dividedBy(1200).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      effectiveEmi = userEmi ?? monthlyServicing;
      hasDiscrepancy = false; // Gold loans have no bank amortization formula discrepancy
    }

    // 2. Create Loan entity
    const loan = await this.loanRepository.create({
      member_id: memberId,
      family_id: familyId,
      name: dto.name || dto.lender,
      place_or_purpose: dto.placeOrPurpose || null,
      comments: dto.comments || null,
      emi_reminders_enabled: dto.emiRemindersEnabled ?? true,
      type: dto.type,
      lender: dto.lender,
      currency: dto.currency || 'INR',
      principal: principal.toString(),
      original_principal: principal.toString(),
      original_tenure_months: tenure,
      current_outstanding_principal: principal.toString(),
      interest_type: interestType,
      compounding_frequency: dto.compoundingFrequency || 'monthly',
      interest_rate: rate.toString(),
      tenure_months: tenure,
      start_date: new Date(dto.startDate),
      emi_amount: effectiveEmi.toString(),
      user_emi_input: userEmi ? userEmi.toString() : null,
      emi_type: dto.emiType || 'fixed',
      prepayment_penalty_type: dto.prepaymentPenaltyType || 'none',
      prepayment_penalty_value: dto.prepaymentPenaltyValue ? new Decimal(dto.prepaymentPenaltyValue).toString() : null,
      country_rule_set: 'IN', // Snapshotted from country at creation
      status: 'active',
      discrepancy_flag: hasDiscrepancy,
      discrepancy_details: hasDiscrepancy ? JSON.stringify({
        calculatedEmi: reconciliation.calculatedEmi.toString(),
        userEmi: userEmi?.toString(),
        diffPct: reconciliation.diffPct,
        impliedRate: reconciliation.impliedRatePct?.toString(),
      }) : null,
    });

    // 3. Generate and persist initial amortization schedule
    const schedule = isGoldLoan
      ? LoanEngine.generateGoldLoanSchedule(
          principal,
          rate,
          tenure || 12,
          new Date(dto.startDate),
        )
      : LoanEngine.generateAmortizationSchedule(
          principal,
          rate,
          tenure,
          new Date(dto.startDate),
          effectiveEmi,
          interestType,
        );

    const dbInstallments = schedule.map((inst) => ({
      loan_id: loan.id,
      installment_number: inst.installment_number,
      due_date: inst.due_date,
      opening_balance: inst.opening_balance.toString(),
      emi_amount: inst.emi_amount.toString(),
      principal_component: inst.principal_component.toString(),
      interest_component: inst.interest_component.toString(),
      closing_balance: inst.closing_balance.toString(),
      is_paid: false,
      is_manually_edited: false,
    }));

    await this.scheduleRepository.createMany(dbInstallments);

    // 4. Record audit entry
    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'loan',
      entity_id: loan.id,
      action: 'create',
    });

    if (isGoldLoan) {
      await this.recalculateLoanOutstanding(loan.id);
      const refreshed = await this.loanRepository.findById(loan.id);
      if (refreshed) return refreshed;
    }

    return loan;
  }

  async recalculateLoanOutstanding(loanId: string): Promise<Decimal> {
    const loan = await this.loanRepository.findById(loanId);
    if (!loan) throw new NotFoundException('Loan not found');

    const isGoldLoan = loan.type === 'jewel' || loan.type === 'gold';
    let outstanding: Decimal;

    if (isGoldLoan) {
      const prepayments = await this.prepaymentRepository.findByLoanId(loanId);
      const transactions = prepayments.map((p) => ({
        date: new Date(p.date).toISOString().split('T')[0],
        type: 'PAYMENT' as const,
        amount: Number(p.amount),
        note: p.notes || 'Gold Loan Payment',
      }));

      const targetDate = new Date().toISOString().split('T')[0];
      const maturityDate = loan.tenure_months
        ? new Date(new Date(loan.start_date).setMonth(new Date(loan.start_date).getMonth() + loan.tenure_months))
            .toISOString()
            .split('T')[0]
        : undefined;

      const summary = GoldLoanCalculator.calculateLedger(
        {
          principal: Number(loan.principal),
          annualRatePercent: Number(loan.interest_rate),
          disbursalDate: new Date(loan.start_date).toISOString().split('T')[0],
          maturityDate,
          dayCountBasis: 365,
          compounding: 'MONTHLY_CAPITALISATION',
          roundingMode: 'ROUND',
          transactions,
        },
        targetDate,
      );

      outstanding = new Decimal(summary.scenarios.scenarioB.totalCost);
    } else {
      const schedule = await this.scheduleRepository.findByLoanId(loanId);
      const unpaid = schedule.filter((i) => !i.is_paid);
      if (schedule.length > 0 && unpaid.length === 0) {
        outstanding = new Decimal(0);
      } else if (unpaid.length > 0) {
        outstanding = new Decimal(unpaid[0].opening_balance.toString());
      } else {
        outstanding = new Decimal(loan.principal.toString());
      }
    }

    const updatePayload: any = {
      current_outstanding_principal: outstanding.toString(),
    };
    if (loan.original_principal === null || loan.original_principal === undefined) {
      updatePayload.original_principal = loan.principal.toString();
    }
    if (loan.original_tenure_months === null || loan.original_tenure_months === undefined) {
      updatePayload.original_tenure_months = loan.tenure_months;
    }

    await this.loanRepository.update(loanId, updatePayload);
    return outstanding;
  }

  async recalculateAllLoans(familyId: string) {
    const loans = await this.loanRepository.findByFamilyId(familyId);
    for (const loan of loans) {
      if (loan.status === 'active') {
        await this.recalculateLoanOutstanding(loan.id);
      }
    }
    return this.loanRepository.findByFamilyId(familyId);
  }

  async getLoans(familyId: string, memberId?: string) {
    const loans = (memberId && memberId !== 'all')
      ? await this.loanRepository.findByMemberId(memberId)
      : await this.loanRepository.findByFamilyId(familyId);

    for (let i = 0; i < loans.length; i++) {
      if (loans[i].current_outstanding_principal == null || loans[i].original_principal == null) {
        await this.recalculateLoanOutstanding(loans[i].id);
        const refreshed = await this.loanRepository.findById(loans[i].id);
        if (refreshed) loans[i] = refreshed;
      }
    }
    return loans;
  }

  async getLoanById(id: string, familyId: string) {
    let loan = await this.loanRepository.findById(id);
    if (!loan || loan.family_id !== familyId) {
      throw new NotFoundException('Loan not found');
    }
    if (loan.current_outstanding_principal == null || loan.original_principal == null) {
      await this.recalculateLoanOutstanding(loan.id);
      loan = await this.loanRepository.findById(id);
      if (!loan) throw new NotFoundException('Loan not found');
    }
    return loan;
  }

  async getSchedule(loanId: string, familyId: string) {
    await this.getLoanById(loanId, familyId);
    return this.scheduleRepository.findByLoanId(loanId);
  }

  async updateLoan(loanId: string, familyId: string, memberId: string, dto: UpdateLoanDto) {
    const loan = await this.getLoanById(loanId, familyId);

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.placeOrPurpose !== undefined) updateData.place_or_purpose = dto.placeOrPurpose;
    if (dto.comments !== undefined) updateData.comments = dto.comments;
    if (dto.emiRemindersEnabled !== undefined) updateData.emi_reminders_enabled = dto.emiRemindersEnabled;
    if (dto.type) updateData.type = dto.type;
    if (dto.lender) updateData.lender = dto.lender;
    if (dto.emiType) updateData.emi_type = dto.emiType;
    if (dto.status) updateData.status = dto.status;

    let termsChanged = false;
    const newRate = dto.interestRate ? new Decimal(dto.interestRate) : new Decimal(loan.interest_rate.toString());
    const newTenure = dto.tenureMonths || loan.tenure_months;

    if (dto.interestRate || dto.tenureMonths || dto.userEmiInput) {
      termsChanged = true;
      updateData.interest_rate = newRate.toString();
      updateData.tenure_months = newTenure;

      const userEmi = dto.userEmiInput ? new Decimal(dto.userEmiInput) : (loan.user_emi_input ? new Decimal(loan.user_emi_input.toString()) : null);
      const reconciliation = LoanEngine.reconcileEmi(new Decimal(loan.principal.toString()), newRate, newTenure, userEmi);

      updateData.emi_amount = reconciliation.effectiveEmi.toString();
      updateData.user_emi_input = userEmi ? userEmi.toString() : null;
      updateData.discrepancy_flag = reconciliation.hasDiscrepancy;
      updateData.discrepancy_details = reconciliation.hasDiscrepancy ? JSON.stringify({
        calculatedEmi: reconciliation.calculatedEmi.toString(),
        userEmi: userEmi?.toString(),
        diffPct: reconciliation.diffPct,
        impliedRate: reconciliation.impliedRatePct?.toString(),
      }) : null;
    }

    const updated = await this.loanRepository.update(loanId, updateData);

    if (termsChanged) {
      // Regenerate future installments
      await this.regenerateScheduleFromNextUnpaid(loanId, updated);
    }

    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'loan',
      entity_id: loanId,
      action: 'update',
    });

    return updated;
  }

  async updateInstallment(loanId: string, installmentId: string, familyId: string, memberId: string, dto: UpdateInstallmentDto) {
    const loan = await this.getLoanById(loanId, familyId);
    const installment = await this.scheduleRepository.findById(installmentId);
    if (!installment || installment.loan_id !== loanId) {
      throw new NotFoundException('Installment not found');
    }

    const updateData: any = { is_manually_edited: true };
    if (dto.isPaid !== undefined) {
      updateData.is_paid = dto.isPaid;
      updateData.paid_date = dto.isPaid ? new Date() : null;
    }
    if (dto.emiAmount) updateData.emi_amount = new Decimal(dto.emiAmount).toString();
    if (dto.principalComponent) updateData.principal_component = new Decimal(dto.principalComponent).toString();
    if (dto.interestComponent) updateData.interest_component = new Decimal(dto.interestComponent).toString();
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    if (dto.principalComponent || dto.emiAmount) {
      const opening = new Decimal(installment.opening_balance.toString());
      const principalComp = dto.principalComponent
        ? new Decimal(dto.principalComponent)
        : (dto.emiAmount ? new Decimal(dto.emiAmount).minus(new Decimal(installment.interest_component.toString())) : new Decimal(installment.principal_component.toString()));
      updateData.principal_component = principalComp.toString();
      updateData.closing_balance = opening.minus(principalComp).toString();
    }

    const updated = await this.scheduleRepository.update(installmentId, updateData);

    // If closing balance changed, ripple regenerate subsequent installments
    if (updateData.closing_balance) {
      await this.regenerateSubsequentInstallments(loan, updated.installment_number + 1, new Decimal(updated.closing_balance.toString()));
    }

    // Bi-directional sync: if paid status changed, update linked expense entry (loan_emi_auto)
    if (this.expenseRepository && dto.isPaid !== undefined) {
      const linkedExpenses = await this.expenseRepository.findByInstallmentId(installmentId);
      for (const exp of linkedExpenses) {
        await this.expenseRepository.update(exp.id, { is_paid: dto.isPaid } as any);
      }
    }

    await this.recalculateLoanOutstanding(loanId);
    return updated;
  }

  async getPrepayments(loanId: string, familyId: string) {
    await this.getLoanById(loanId, familyId);
    return this.prepaymentRepository.findByLoanId(loanId);
  }

  async getRateRevisions(loanId: string, familyId: string) {
    await this.getLoanById(loanId, familyId);
    return this.rateRevisionRepository.findByLoanId(loanId);
  }

  async calculateBrokenPeriodInterest(loanId: string, familyId: string, dateStr: string) {
    const loan = await this.getLoanById(loanId, familyId);
    const schedule = await this.scheduleRepository.findByLoanId(loanId);
    const paymentDate = new Date(dateStr);

    const unpaid = schedule.filter((i) => !i.is_paid);
    const targetInst = unpaid[0] || schedule[schedule.length - 1];
    if (!targetInst) throw new BadRequestException('No active schedule found for loan');

    const paidList = schedule.filter((i) => i.is_paid);
    const lastPaid = paidList[paidList.length - 1];
    const prevDate = lastPaid ? new Date(lastPaid.due_date) : new Date(loan.start_date);

    const diffMs = paymentDate.getTime() - prevDate.getTime();
    const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    const currentOutstanding = new Decimal(targetInst.opening_balance.toString());
    const rate = new Decimal(loan.interest_rate.toString());
    const estimatedInterest = LoanEngine.calculateBrokenPeriodInterest(currentOutstanding, rate, days);

    return {
      days,
      currentOutstanding: currentOutstanding.toString(),
      interestRate: rate.toString(),
      estimatedBrokenPeriodInterest: estimatedInterest.toString(),
      prevDate,
    };
  }

  async previewPrepayment(loanId: string, familyId: string, dto: PrepaymentPreviewDto) {
    const loan = await this.getLoanById(loanId, familyId);
    const schedule = await this.scheduleRepository.findByLoanId(loanId);

    // Find the next unpaid installment
    const unpaid = schedule.filter((i) => !i.is_paid);
    const nextInstallment = unpaid[0] || schedule[schedule.length - 1];
    if (!nextInstallment) throw new BadRequestException('No active schedule found for loan');

    const currentOutstanding = new Decimal(nextInstallment.opening_balance.toString());
    const remainingTenure = unpaid.length;
    const currentPayoff = schedule[schedule.length - 1].due_date;
    const accruedInterest = dto.accruedInterest ? new Decimal(dto.accruedInterest) : new Decimal(0);

    return LoanEngine.calculatePrepaymentImpact(
      currentOutstanding,
      new Decimal(loan.interest_rate.toString()),
      new Decimal(loan.emi_amount.toString()),
      remainingTenure,
      new Decimal(dto.amount),
      dto.mode,
      new Date(dto.date),
      new Date(currentPayoff),
      loan.prepayment_penalty_type,
      loan.prepayment_penalty_value ? new Decimal(loan.prepayment_penalty_value.toString()) : null,
      accruedInterest,
    );
  }

  async applyPrepayment(loanId: string, familyId: string, memberId: string, dto: ApplyPrepaymentDto) {
    const loan = await this.getLoanById(loanId, familyId);
    const preview = await this.previewPrepayment(loanId, familyId, dto);
    const accruedInterest = dto.accruedInterest ? new Decimal(dto.accruedInterest) : new Decimal(0);

    // 1. Record prepayment
    const record = await this.prepaymentRepository.create({
      loan_id: loanId,
      amount: new Decimal(dto.amount).toString(),
      date: new Date(dto.date),
      mode: dto.mode,
      penalty_amount: preview.penaltyAmount.toString(),
      accrued_interest: accruedInterest.toString(),
      total_paid: preview.totalPaid.toString(),
      interest_saved: preview.interestSaved.toString(),
      previous_payoff_date: preview.previousPayoffDate,
      new_payoff_date: preview.newPayoffDate,
      previous_emi: preview.previousEmi.toString(),
      new_emi: preview.newEmi.toString(),
      notes: dto.notes || null,
    });

    // 2. Regenerate future schedule from next unpaid installment
    const schedule = await this.scheduleRepository.findByLoanId(loanId);
    const unpaid = schedule.filter((i) => !i.is_paid);
    const nextInst = unpaid[0];

    if (nextInst) {
      const remainingBalance = new Decimal(nextInst.opening_balance.toString()).minus(new Decimal(dto.amount));
      const newRemainingTenure = dto.mode === 'reduce_tenure'
        ? Math.max(1, unpaid.length - preview.tenureReducedMonths)
        : unpaid.length;

      if (dto.mode === 'reduce_emi') {
        await this.loanRepository.update(loanId, { emi_amount: preview.newEmi.toString() as any });
      } else if (dto.mode === 'reduce_tenure') {
        const paidCount = schedule.filter((i) => i.is_paid).length;
        await this.loanRepository.update(loanId, { tenure_months: paidCount + newRemainingTenure });
      }

      await this.scheduleRepository.deleteFutureInstallments(loanId, nextInst.installment_number);

      const newFutureSchedule = LoanEngine.generateAmortizationSchedule(
        remainingBalance,
        new Decimal(loan.interest_rate.toString()),
        newRemainingTenure,
        nextInst.due_date,
        dto.mode === 'reduce_emi' ? preview.newEmi : new Decimal(loan.emi_amount.toString()),
        loan.interest_type,
      );

      const dbInstallments = newFutureSchedule.map((inst, index) => ({
        loan_id: loanId,
        installment_number: nextInst.installment_number + index,
        due_date: inst.due_date,
        opening_balance: inst.opening_balance.toString(),
        emi_amount: inst.emi_amount.toString(),
        principal_component: inst.principal_component.toString(),
        interest_component: inst.interest_component.toString(),
        closing_balance: inst.closing_balance.toString(),
        is_paid: false,
        is_manually_edited: false,
      }));

      await this.scheduleRepository.createMany(dbInstallments);
    }

    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'loan',
      entity_id: loanId,
      action: 'update',
      field_changes: JSON.stringify({
        prepayment: {
          amount: dto.amount,
          mode: dto.mode,
          accruedInterest: accruedInterest.toString(),
          totalPaid: preview.totalPaid.toString(),
          interestSaved: preview.interestSaved.toString(),
        },
      }),
    });

    await this.recalculateLoanOutstanding(loanId);
    return record;
  }

  async previewRateRevision(loanId: string, familyId: string, dto: RateRevisionDto) {
    const loan = await this.getLoanById(loanId, familyId);
    const schedule = await this.scheduleRepository.findByLoanId(loanId);

    const unpaid = schedule.filter((i) => !i.is_paid);
    const targetInst = unpaid[0] || schedule[schedule.length - 1];
    if (!targetInst) throw new BadRequestException('No active schedule found for loan');

    const currentOutstanding = new Decimal(targetInst.opening_balance.toString());
    const oldRate = new Decimal(loan.interest_rate.toString());
    const newRate = new Decimal(dto.newRate);
    const currentEmi = new Decimal(loan.emi_amount.toString());
    const remainingTenure = unpaid.length;
    const currentPayoff = schedule[schedule.length - 1].due_date;

    return LoanEngine.calculateRateRevisionImpact(
      currentOutstanding,
      oldRate,
      newRate,
      currentEmi,
      remainingTenure,
      dto.policy,
      new Date(dto.effectiveDate),
      new Date(currentPayoff),
    );
  }

  async applyRateRevision(loanId: string, familyId: string, memberId: string, dto: RateRevisionDto) {
    const loan = await this.getLoanById(loanId, familyId);
    const preview = await this.previewRateRevision(loanId, familyId, dto);
    const schedule = await this.scheduleRepository.findByLoanId(loanId);
    const unpaid = schedule.filter((i) => !i.is_paid);
    const nextInst = unpaid[0];
    if (!nextInst) throw new BadRequestException('No active unpaid schedule found');

    const currentOutstanding = new Decimal(nextInst.opening_balance.toString());

    // 1. Record rate revision
    const revision = await this.rateRevisionRepository.create({
      loan_id: loanId,
      effective_date: new Date(dto.effectiveDate),
      old_rate: preview.oldRate.toString(),
      new_rate: preview.newRate.toString(),
      policy: dto.policy,
      old_tenure_months: preview.oldTenureMonths,
      new_tenure_months: preview.newTenureMonths,
      old_emi: preview.oldEmi.toString(),
      new_emi: preview.newEmi.toString(),
      interest_saved: preview.interestSaved.toString(),
      notes: dto.notes || null,
    });

    // 2. Update loan entity
    const paidCount = schedule.filter((i) => i.is_paid).length;
    const totalTenureMonths = paidCount + preview.newTenureMonths;

    await this.loanRepository.update(loanId, {
      interest_rate: preview.newRate.toString() as any,
      tenure_months: totalTenureMonths,
      emi_amount: preview.newEmi.toString() as any,
    });

    // 3. Regenerate future installments
    await this.scheduleRepository.deleteFutureInstallments(loanId, nextInst.installment_number);

    const newFutureSchedule = LoanEngine.generateAmortizationSchedule(
      currentOutstanding,
      preview.newRate,
      preview.newTenureMonths,
      nextInst.due_date,
      preview.newEmi,
      loan.interest_type,
    );

    const dbInstallments = newFutureSchedule.map((inst, index) => ({
      loan_id: loanId,
      installment_number: nextInst.installment_number + index,
      due_date: inst.due_date,
      opening_balance: inst.opening_balance.toString(),
      emi_amount: inst.emi_amount.toString(),
      principal_component: inst.principal_component.toString(),
      interest_component: inst.interest_component.toString(),
      closing_balance: inst.closing_balance.toString(),
      is_paid: false,
      is_manually_edited: false,
    }));

    await this.scheduleRepository.createMany(dbInstallments);

    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'loan',
      entity_id: loanId,
      action: 'update',
      field_changes: JSON.stringify({
        rateRevision: {
          oldRate: preview.oldRate.toString(),
          newRate: preview.newRate.toString(),
          policy: dto.policy,
          tenureDiff: preview.tenureDiffMonths,
          interestSaved: preview.interestSaved.toString(),
        },
      }),
    });

    await this.recalculateLoanOutstanding(loanId);
    return revision;
  }

  async calibrateLoan(loanId: string, familyId: string, memberId: string, dto: CalibrateLoanDto) {
    const loan = await this.getLoanById(loanId, familyId);
    const outstanding = new Decimal(dto.currentOutstanding);
    const rate = new Decimal(dto.currentRate);
    const tenureMonths = dto.remainingTenureMonths;
    const emi = new Decimal(dto.emiAmount);
    const effectiveDate = new Date(dto.effectiveDate);

    // 1. Update loan terms
    await this.loanRepository.update(loanId, {
      principal: outstanding.toString() as any,
      interest_rate: rate.toString() as any,
      tenure_months: tenureMonths,
      emi_amount: emi.toString() as any,
      user_emi_input: emi.toString() as any,
    });

    // 2. Clear old schedule and generate new schedule starting from effectiveDate
    await this.scheduleRepository.deleteFutureInstallments(loanId, 1);

    const newSchedule = LoanEngine.generateAmortizationSchedule(
      outstanding,
      rate,
      tenureMonths,
      effectiveDate,
      emi,
      loan.interest_type,
    );

    const dbInstallments = newSchedule.map((inst, index) => ({
      loan_id: loanId,
      installment_number: 1 + index,
      due_date: inst.due_date,
      opening_balance: inst.opening_balance.toString(),
      emi_amount: inst.emi_amount.toString(),
      principal_component: inst.principal_component.toString(),
      interest_component: inst.interest_component.toString(),
      closing_balance: inst.closing_balance.toString(),
      is_paid: false,
      is_manually_edited: false,
    }));

    await this.scheduleRepository.createMany(dbInstallments);

    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'loan',
      entity_id: loanId,
      action: 'update',
      field_changes: JSON.stringify({
        calibration: {
          outstanding: dto.currentOutstanding,
          rate: dto.currentRate,
          tenure: dto.remainingTenureMonths,
          emi: dto.emiAmount,
        },
      }),
    });

    await this.recalculateLoanOutstanding(loanId);
    return { message: 'Loan calibrated to statement successfully' };
  }

  async softDeleteLoan(loanId: string, familyId: string, memberId: string) {
    await this.getLoanById(loanId, familyId);
    await this.loanRepository.softDelete(loanId);

    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'loan',
      entity_id: loanId,
      action: 'delete',
    });

    return { message: 'Loan deleted successfully' };
  }

  private async regenerateScheduleFromNextUnpaid(loanId: string, loan: any) {
    const schedule = await this.scheduleRepository.findByLoanId(loanId);
    const unpaid = schedule.filter((i) => !i.is_paid);
    if (unpaid.length === 0) return;

    const nextInst = unpaid[0];
    const openingBalance = new Decimal(nextInst.opening_balance.toString());

    await this.scheduleRepository.deleteFutureInstallments(loanId, nextInst.installment_number);

    const newSchedule = LoanEngine.generateAmortizationSchedule(
      openingBalance,
      new Decimal(loan.interest_rate.toString()),
      loan.tenure_months - nextInst.installment_number + 1,
      nextInst.due_date,
      new Decimal(loan.emi_amount.toString()),
      loan.interest_type,
    );

    const dbInstallments = newSchedule.map((inst, index) => ({
      loan_id: loanId,
      installment_number: nextInst.installment_number + index,
      due_date: inst.due_date,
      opening_balance: inst.opening_balance.toString(),
      emi_amount: inst.emi_amount.toString(),
      principal_component: inst.principal_component.toString(),
      interest_component: inst.interest_component.toString(),
      closing_balance: inst.closing_balance.toString(),
      is_paid: false,
      is_manually_edited: false,
    }));

    await this.scheduleRepository.createMany(dbInstallments);
  }

  private async regenerateSubsequentInstallments(loan: any, startInstallmentNumber: number, startingOpeningBalance: Decimal) {
    const schedule = await this.scheduleRepository.findByLoanId(loan.id);
    const subsequent = schedule.filter((i) => i.installment_number >= startInstallmentNumber);
    if (subsequent.length === 0) return;

    await this.scheduleRepository.deleteFutureInstallments(loan.id, startInstallmentNumber);

    const newSchedule = LoanEngine.generateAmortizationSchedule(
      startingOpeningBalance,
      new Decimal(loan.interest_rate.toString()),
      subsequent.length,
      subsequent[0].due_date,
      new Decimal(loan.emi_amount.toString()),
      loan.interest_type,
    );

    const dbInstallments = newSchedule.map((inst, index) => ({
      loan_id: loan.id,
      installment_number: startInstallmentNumber + index,
      due_date: inst.due_date,
      opening_balance: inst.opening_balance.toString(),
      emi_amount: inst.emi_amount.toString(),
      principal_component: inst.principal_component.toString(),
      interest_component: inst.interest_component.toString(),
      closing_balance: inst.closing_balance.toString(),
      is_paid: false,
      is_manually_edited: false,
    }));

    await this.scheduleRepository.createMany(dbInstallments);
  }

  /**
   * Calculates the full running-balance statement ledger for a gold loan.
   */
  async getGoldLoanLedger(loanId: string, familyId: string, asOfDate?: string) {
    const loan = await this.getLoanById(loanId, familyId);
    const prepayments = await this.prepaymentRepository.findByLoanId(loanId);

    const transactions = prepayments.map((p) => ({
      date: new Date(p.date).toISOString().split('T')[0],
      type: 'PAYMENT' as const,
      amount: Number(p.amount),
      note: p.notes || 'Gold Loan Payment',
    }));

    const targetDate = asOfDate || new Date().toISOString().split('T')[0];

    const maturityDate = loan.tenure_months
      ? new Date(new Date(loan.start_date).setMonth(new Date(loan.start_date).getMonth() + loan.tenure_months))
          .toISOString()
          .split('T')[0]
      : undefined;

    const summary = GoldLoanCalculator.calculateLedger(
      {
        principal: Number(loan.principal),
        annualRatePercent: Number(loan.interest_rate),
        disbursalDate: new Date(loan.start_date).toISOString().split('T')[0],
        maturityDate,
        dayCountBasis: 365,
        compounding: 'MONTHLY_CAPITALISATION',
        roundingMode: 'ROUND',
        transactions,
      },
      targetDate,
    );

    return {
      entries: summary.ledger,
      currentOutstandingToday: summary.asOfStats.payoffAsOfDate,
      postedBalance: summary.asOfStats.postedBalance,
      accruedInterestUnposted: summary.asOfStats.unpostedAccrued,
      payoffQuoteToday: summary.asOfStats.payoffAsOfDate,
      totalInterestCharged: summary.totals.totalInterestYours,
      compoundingCost: summary.compoundingCost.compoundingPenalty,
      simpleInterest: summary.compoundingCost.simpleInterest,
      smartTip: summary.smartTip,
      asOfDate: targetDate,
      summary,
    };
  }

  /**
   * Records an ad-hoc payment for a gold loan.
   */
  async addGoldLoanPayment(
    loanId: string,
    familyId: string,
    memberId: string,
    dto: { paymentDate: string; amount: string; notes?: string },
  ) {
    const loan = await this.getLoanById(loanId, familyId);
    const payAmt = new Decimal(dto.amount);
    if (payAmt.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    const prepayment = await this.prepaymentRepository.create({
      loan_id: loan.id,
      date: new Date(dto.paymentDate),
      amount: payAmt.toString(),
      mode: 'reduce_tenure',
      penalty_amount: '0',
      accrued_interest: '0',
      notes: dto.notes || 'Gold Loan Payment',
    });

    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'loan',
      entity_id: loan.id,
      action: 'payment',
      field_changes: JSON.stringify({ amount: dto.amount, paymentDate: dto.paymentDate }),
    });

    await this.recalculateLoanOutstanding(loan.id);
    return prepayment;
  }

  /**
   * Deletes a gold loan payment.
   */
  async deleteGoldLoanPayment(loanId: string, familyId: string, memberId: string, paymentId: string) {
    await this.getLoanById(loanId, familyId);
    await this.prepaymentRepository.delete(paymentId);
    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'loan',
      entity_id: loanId,
      action: 'delete_payment',
      field_changes: JSON.stringify({ paymentId }),
    });
    await this.recalculateLoanOutstanding(loanId);
    return { success: true };
  }

  /**
   * Deletes a prepayment record with conflict check, balance restoration, and schedule regeneration.
   */
  async deletePrepayment(loanId: string, familyId: string, memberId: string, prepaymentId: string) {
    const loan = await this.getLoanById(loanId, familyId);
    const prepayment = await this.prepaymentRepository.findById(prepaymentId);
    if (!prepayment || prepayment.loan_id !== loanId) {
      throw new NotFoundException('Prepayment record not found');
    }

    const schedule = await this.scheduleRepository.findByLoanId(loanId);
    const prepDate = new Date(prepayment.date);
    const conflictingPaid = schedule.find((inst) => inst.is_paid && new Date(inst.due_date) >= prepDate);
    if (conflictingPaid) {
      throw new BadRequestException(
        `Cannot delete part-payment: Installment #${conflictingPaid.installment_number} due on ${new Date(conflictingPaid.due_date).toLocaleDateString()} after the payment date has already been marked as paid. Please unmark it first.`,
      );
    }

    const unpaid = schedule.filter((i) => !i.is_paid);
    const nextInst = unpaid[0];
    if (nextInst) {
      const restoredBalance = new Decimal(nextInst.opening_balance.toString()).plus(new Decimal(prepayment.amount.toString()));

      let restoredEmi = new Decimal(loan.emi_amount.toString());
      let restoredRemainingTenure = unpaid.length;

      if (prepayment.mode === 'reduce_emi') {
        restoredEmi = prepayment.previous_emi ? new Decimal(prepayment.previous_emi.toString()) : restoredEmi;
        await this.loanRepository.update(loanId, { emi_amount: restoredEmi.toString() as any });
      } else if (prepayment.mode === 'reduce_tenure') {
        const r = new Decimal(loan.interest_rate.toString()).dividedBy(12).dividedBy(100);
        const numeratorInner = new Decimal(1).minus(r.times(restoredBalance).dividedBy(restoredEmi));
        if (numeratorInner.greaterThan(0)) {
          const lnNumerator = Decimal.ln(numeratorInner);
          const lnDenominator = Decimal.ln(new Decimal(1).plus(r));
          restoredRemainingTenure = Math.ceil(lnNumerator.negated().dividedBy(lnDenominator).toNumber());
        }
        const paidCount = schedule.filter((i) => i.is_paid).length;
        await this.loanRepository.update(loanId, { tenure_months: paidCount + restoredRemainingTenure });
      }

      await this.scheduleRepository.deleteFutureInstallments(loanId, nextInst.installment_number);

      const newFutureSchedule = LoanEngine.generateAmortizationSchedule(
        restoredBalance,
        new Decimal(loan.interest_rate.toString()),
        restoredRemainingTenure,
        nextInst.due_date,
        restoredEmi,
        loan.interest_type,
      );

      const dbInstallments = newFutureSchedule.map((inst, index) => ({
        loan_id: loanId,
        installment_number: nextInst.installment_number + index,
        due_date: inst.due_date,
        opening_balance: inst.opening_balance.toString(),
        emi_amount: inst.emi_amount.toString(),
        principal_component: inst.principal_component.toString(),
        interest_component: inst.interest_component.toString(),
        closing_balance: inst.closing_balance.toString(),
        is_paid: false,
        is_manually_edited: false,
      }));

      await this.scheduleRepository.createMany(dbInstallments);
    }

    await this.prepaymentRepository.delete(prepaymentId);

    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'loan',
      entity_id: loanId,
      action: 'delete_prepayment',
      field_changes: JSON.stringify({
        prepaymentId,
        amount: prepayment.amount.toString(),
        mode: prepayment.mode,
      }),
    });

    await this.recalculateLoanOutstanding(loanId);

    return { success: true };
  }

  /**
   * Deletes a rate revision record with conflict check and schedule regeneration.
   */
  async deleteRateRevision(loanId: string, familyId: string, memberId: string, revisionId: string) {
    const loan = await this.getLoanById(loanId, familyId);
    const revision = await this.rateRevisionRepository.findById(revisionId);
    if (!revision || revision.loan_id !== loanId) {
      throw new NotFoundException('Rate revision record not found');
    }

    const schedule = await this.scheduleRepository.findByLoanId(loanId);
    const effDate = new Date(revision.effective_date);
    const conflictingPaid = schedule.find((inst) => inst.is_paid && new Date(inst.due_date) >= effDate);
    if (conflictingPaid) {
      throw new BadRequestException(
        `Cannot delete rate revision: Installment #${conflictingPaid.installment_number} due on ${new Date(conflictingPaid.due_date).toLocaleDateString()} after the effective date has already been marked as paid. Please unmark it first.`,
      );
    }

    const unpaid = schedule.filter((i) => !i.is_paid);
    const nextInst = unpaid[0];
    if (nextInst) {
      const currentOutstanding = new Decimal(nextInst.opening_balance.toString());
      const oldRate = new Decimal(revision.old_rate.toString());
      const oldEmi = new Decimal(revision.old_emi.toString());
      let restoredRemainingTenure = unpaid.length;

      if (revision.policy === 'keep_emi') {
        const r = oldRate.dividedBy(12).dividedBy(100);
        const numeratorInner = new Decimal(1).minus(r.times(currentOutstanding).dividedBy(oldEmi));
        if (numeratorInner.greaterThan(0)) {
          const lnNum = Decimal.ln(numeratorInner);
          const lnDen = Decimal.ln(new Decimal(1).plus(r));
          restoredRemainingTenure = Math.ceil(lnNum.negated().dividedBy(lnDen).toNumber());
        }
      }

      const paidCount = schedule.filter((i) => i.is_paid).length;
      await this.loanRepository.update(loanId, {
        interest_rate: oldRate.toString() as any,
        emi_amount: oldEmi.toString() as any,
        tenure_months: paidCount + restoredRemainingTenure,
      });

      await this.scheduleRepository.deleteFutureInstallments(loanId, nextInst.installment_number);

      const newFutureSchedule = LoanEngine.generateAmortizationSchedule(
        currentOutstanding,
        oldRate,
        restoredRemainingTenure,
        nextInst.due_date,
        oldEmi,
        loan.interest_type,
      );

      const dbInstallments = newFutureSchedule.map((inst, index) => ({
        loan_id: loanId,
        installment_number: nextInst.installment_number + index,
        due_date: inst.due_date,
        opening_balance: inst.opening_balance.toString(),
        emi_amount: inst.emi_amount.toString(),
        principal_component: inst.principal_component.toString(),
        interest_component: inst.interest_component.toString(),
        closing_balance: inst.closing_balance.toString(),
        is_paid: false,
        is_manually_edited: false,
      }));

      await this.scheduleRepository.createMany(dbInstallments);
    }

    await this.rateRevisionRepository.delete(revisionId);

    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'loan',
      entity_id: loanId,
      action: 'delete_rate_revision',
      field_changes: JSON.stringify({
        revisionId,
        revertedToRate: revision.old_rate.toString(),
        revertedToEmi: revision.old_emi.toString(),
      }),
    });

    await this.recalculateLoanOutstanding(loanId);

    return { success: true };
  }

  /**
   * Previews interest saving for a prospective gold loan payment.
   */
  async previewGoldLoanPayment(
    loanId: string,
    familyId: string,
    dto: { paymentDate: string; amount: string },
  ) {
    const loan = await this.getLoanById(loanId, familyId);
    const prepayments = await this.prepaymentRepository.findByLoanId(loanId);
    const transactions = prepayments.map((p) => ({
      id: p.id,
      date: new Date(p.date).toISOString().split('T')[0],
      type: 'PAYMENT' as const,
      amount: Number(p.amount),
      note: p.notes || 'Gold Loan Payment',
    }));

    const maturityDate = loan.tenure_months
      ? new Date(new Date(loan.start_date).setMonth(new Date(loan.start_date).getMonth() + loan.tenure_months))
          .toISOString()
          .split('T')[0]
      : undefined;

    const saved = GoldLoanCalculator.previewPaymentSaving(
      {
        principal: Number(loan.principal),
        annualRatePercent: Number(loan.interest_rate),
        disbursalDate: new Date(loan.start_date).toISOString().split('T')[0],
        maturityDate,
        dayCountBasis: 365,
        compounding: 'MONTHLY_CAPITALISATION',
        roundingMode: 'ROUND',
        transactions,
      },
      dto.paymentDate,
      dto.amount,
    );

    return { interestSaved: saved };
  }
}
