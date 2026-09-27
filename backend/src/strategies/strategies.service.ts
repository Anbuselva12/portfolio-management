import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import {
  ILoanRepository,
  I_LOAN_REPOSITORY,
  IRepaymentScheduleRepository,
  I_REPAYMENT_SCHEDULE_REPOSITORY,
  IIncomeRepository,
  I_INCOME_REPOSITORY,
  IExpenseRepository,
  I_EXPENSE_REPOSITORY,
  IInsurancePolicyRepository,
  I_INSURANCE_POLICY_REPOSITORY,
  ISuggestionSnapshotRepository,
  I_SUGGESTION_SNAPSHOT_REPOSITORY,
  IAuditRepository,
  I_AUDIT_REPOSITORY,
} from '../repositories/interfaces';
import { StrategyEngine, StrategyLoanInput, CustomWeights, StrategySimulationResult } from './engine/strategy-engine';
import { GeminiAiService } from './engine/gemini-ai.service';
import { CompareStrategiesDto, SaveSnapshotDto, CustomWeightsDto } from './dto';

@Injectable()
export class StrategiesService {
  constructor(
    @Inject(I_LOAN_REPOSITORY) private readonly loanRepository: ILoanRepository,
    @Inject(I_REPAYMENT_SCHEDULE_REPOSITORY) private readonly scheduleRepository: IRepaymentScheduleRepository,
    @Inject(I_INCOME_REPOSITORY) private readonly incomeRepository: IIncomeRepository,
    @Inject(I_EXPENSE_REPOSITORY) private readonly expenseRepository: IExpenseRepository,
    @Inject(I_INSURANCE_POLICY_REPOSITORY) private readonly insuranceRepository: IInsurancePolicyRepository,
    @Inject(I_SUGGESTION_SNAPSHOT_REPOSITORY) private readonly snapshotRepository: ISuggestionSnapshotRepository,
    @Inject(I_AUDIT_REPOSITORY) private readonly auditRepository: IAuditRepository,
    private readonly geminiAiService: GeminiAiService,
  ) {}

  async compareStrategies(familyId: string, memberId: string, dto: CompareStrategiesDto) {
    const allLoans = await this.loanRepository.findByFamilyId(familyId);
    const activeLoans = allLoans.filter((l) => l.status === 'active');

    // 1. Calculate automated surplus = Income - Expenses - Insurance - Fixed EMIs
    const [incomes, expenses, insurances] = await Promise.all([
      this.incomeRepository.findByFamilyId(familyId),
      this.expenseRepository.findByFamilyId(familyId),
      this.insuranceRepository.findByFamilyId(familyId),
    ]);

    const monthlyIncome = incomes
      .filter((i) => i.status === 'active' && i.recurrence === 'recurring_monthly')
      .reduce((sum, i) => sum.plus(new Decimal(i.amount.toString())), new Decimal(0));

    // Trailing 30 days expenses average
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentExpenses = expenses.filter((e) => new Date(e.date) >= thirtyDaysAgo);
    const monthlyExpenses = recentExpenses.reduce((sum, e) => sum.plus(new Decimal(e.amount.toString())), new Decimal(0));

    // Annualized/Monthly insurance premiums
    let monthlyInsurance = new Decimal(0);
    for (const p of insurances.filter((i) => i.status === 'active')) {
      const prem = new Decimal(p.premium_amount.toString());
      if (p.premium_frequency === 'annual') {
        monthlyInsurance = monthlyInsurance.plus(prem.dividedBy(12));
      } else if (p.premium_frequency === 'quarterly') {
        monthlyInsurance = monthlyInsurance.plus(prem.dividedBy(3));
      } else {
        monthlyInsurance = monthlyInsurance.plus(prem);
      }
    }

    const totalEmi = activeLoans.reduce((sum, l) => sum.plus(new Decimal(l.emi_amount.toString())), new Decimal(0));
    const autoSurplus = Decimal.max(0, monthlyIncome.minus(monthlyExpenses).minus(monthlyInsurance).minus(totalEmi));

    // User override or auto surplus
    let effectiveSurplus = autoSurplus;
    if (dto.surplusOverride && Number(dto.surplusOverride) > 0) {
      effectiveSurplus = new Decimal(dto.surplusOverride);
    }

    // 2. Prepare strategy loan inputs with remaining balances from schedule
    const loanInputs: StrategyLoanInput[] = [];
    for (const l of activeLoans) {
      const schedule = await this.scheduleRepository.findByLoanId(l.id);
      const unpaid = schedule.filter((i) => !i.is_paid);
      const currentBal = unpaid[0] ? new Decimal(unpaid[0].opening_balance.toString()) : new Decimal(l.principal.toString());
      const remainingTenure = unpaid.length > 0 ? unpaid.length : l.tenure_months;

      if (currentBal.greaterThan(0)) {
        loanInputs.push({
          id: l.id,
          name: (l as any).name || l.lender,
          placeOrPurpose: (l as any).place_or_purpose,
          lender: l.lender,
          type: l.type,
          principal: currentBal,
          interestRate: new Decimal(l.interest_rate.toString()),
          emiAmount: new Decimal(l.emi_amount.toString()),
          tenureMonths: remainingTenure,
          prepaymentPenaltyType: l.prepayment_penalty_type,
          prepaymentPenaltyValue: l.prepayment_penalty_value ? new Decimal(l.prepayment_penalty_value.toString()) : null,
          emiType: l.emi_type as any,
        });
      }
    }

    const totalDebt = loanInputs.reduce((sum, l) => sum.plus(l.principal), new Decimal(0));

    const prepaymentMode = dto.prepaymentMode || 'one_off_lump_sum';

    // 3. Baseline Simulation
    const baseline = StrategyEngine.simulateBaseline(loanInputs);
    const baselineInterest = new Decimal(baseline.totalInterestPaid);

    // 4. Avalanche Simulation
    const avalanche = StrategyEngine.simulateAvalanche(loanInputs, effectiveSurplus, baselineInterest, prepaymentMode);

    // 5. Snowball Simulation
    const snowball = StrategyEngine.simulateSnowball(loanInputs, effectiveSurplus, baselineInterest, prepaymentMode);

    // 6. Custom-Weighted Simulation
    const weights: CustomWeights = {
      weightRate: dto.customWeights?.weightRate ?? 40,
      weightBalance: dto.customWeights?.weightBalance ?? 30,
      weightFlexibility: dto.customWeights?.weightFlexibility ?? 10,
      weightPenalty: dto.customWeights?.weightPenalty ?? 10,
      weightTenure: dto.customWeights?.weightTenure ?? 10,
      mode: dto.customWeights?.mode ?? 'cascade',
    };
    const customWeighted = StrategyEngine.simulateCustomWeighted(loanInputs, effectiveSurplus, weights, baselineInterest, prepaymentMode);

    // 7. Gemini AI Suggestion (Graceful degradation)
    let aiStrategy: StrategySimulationResult | null = null;
    if (loanInputs.length > 0 && effectiveSurplus.greaterThan(0)) {
      const aiResponse = await this.geminiAiService.getAiStrategy(loanInputs, effectiveSurplus, prepaymentMode);
      if (aiResponse && aiResponse.allocations.length > 0) {
        aiStrategy = StrategyEngine.simulateAiStrategy(
          loanInputs,
          effectiveSurplus,
          aiResponse.allocations,
          aiResponse.rationale,
          baselineInterest,
          prepaymentMode,
        );
      }
    }

    const strategies: StrategySimulationResult[] = [baseline, avalanche, snowball, customWeighted];
    if (aiStrategy) {
      strategies.push(aiStrategy);
    }

    return {
      autoSurplus: autoSurplus.toFixed(2),
      activeSurplus: effectiveSurplus.toFixed(2),
      prepaymentMode,
      totalDebt: totalDebt.toFixed(2),
      loanCount: loanInputs.length,
      baseline,
      strategies,
    };
  }

  async saveSnapshot(familyId: string, memberId: string, dto: SaveSnapshotDto) {
    const snap = await this.snapshotRepository.create({
      family_id: familyId,
      member_id: memberId,
      strategy_name: dto.strategyName,
      surplus: dto.surplus,
      allocations: typeof dto.allocations === 'string' ? dto.allocations : JSON.stringify(dto.allocations),
      metrics: typeof dto.metrics === 'string' ? dto.metrics : JSON.stringify(dto.metrics),
    });

    await this.auditRepository.create({
      family_id: familyId,
      member_id: memberId,
      entity_type: 'suggestion_snapshot',
      entity_id: snap.id,
      action: 'create',
      field_changes: JSON.stringify({ strategy_name: { old: null, new: dto.strategyName } }),
    });

    return snap;
  }

  async getLatestSnapshot(familyId: string) {
    return this.snapshotRepository.findLatestByFamilyId(familyId);
  }
}

