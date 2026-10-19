import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import {
  I_AUDIT_REPOSITORY,
  I_INCOME_REPOSITORY,
  I_LOAN_REPOSITORY,
  I_PREPAYMENT_REPOSITORY,
  I_REPAYMENT_SCHEDULE_REPOSITORY,
  I_TRACKER_REPOSITORY,
  IAuditRepository,
  IIncomeRepository,
  ILoanRepository,
  IPrepaymentRepository,
  IRepaymentScheduleRepository,
  ITrackerRepository,
} from '../repositories/interfaces';
import {
  calculateFundingReturns,
  FundingReturnsResult,
  IncomeFundingInput,
  LoanFundingInput,
} from './funding-returns.calculator';
import { SetLoanAllocationsDto } from './dto/set-loan-allocations.dto';

const GOLD_LOAN_TYPES = new Set(['gold', 'jewel']);

export interface ProjectHubSummary {
  fundedByLoans: string;
  fundedByLoansPct: string | null;
  monthlyIncome: string;
  totalIncomeReceived: string;
  grossYieldPct: string | null;
  linkedLoansCount: number;
  linkedIncomeCount: number;
}

/**
 * Project funding & returns (SDD §4.11): loan allocations, tagged income and the derived yield metrics.
 * All reads are family-scoped; the maths lives in the pure `funding-returns.calculator`.
 */
@Injectable()
export class ProjectFundingService {
  constructor(
    @Inject(I_TRACKER_REPOSITORY) private readonly trackerRepo: ITrackerRepository,
    @Inject(I_LOAN_REPOSITORY) private readonly loanRepo: ILoanRepository,
    @Inject(I_INCOME_REPOSITORY) private readonly incomeRepo: IIncomeRepository,
    @Inject(I_REPAYMENT_SCHEDULE_REPOSITORY) private readonly scheduleRepo: IRepaymentScheduleRepository,
    @Inject(I_PREPAYMENT_REPOSITORY) private readonly prepaymentRepo: IPrepaymentRepository,
    @Inject(I_AUDIT_REPOSITORY) private readonly auditRepo: IAuditRepository,
  ) {}

  // ─── Funding & returns ────────────────────────────────────────────────────

  /** Full Funding & Returns payload for one project. */
  async getFundingReturns(familyId: string, projectId: string): Promise<FundingReturnsResult> {
    const project = await this.trackerRepo.findProjectById(projectId);
    if (!project || project.family_id !== familyId || !project.is_active) {
      throw new NotFoundException('Project not found');
    }
    const [invested, ctx] = await Promise.all([this.sumInvested(projectId), this.loadFamilyContext(familyId)]);
    return this.computeForProject(project, invested, ctx);
  }

  /** Compact per-project figures for the Projects hub cards (single batch, no N+1). */
  async getHubSummaries(
    familyId: string,
    projects: Array<{ id: string; current_value?: unknown }>,
    investedByProject: Map<string, Decimal>,
  ): Promise<Map<string, ProjectHubSummary>> {
    const ctx = await this.loadFamilyContext(familyId);
    const out = new Map<string, ProjectHubSummary>();
    for (const p of projects) {
      const r = await this.computeForProject(p, investedByProject.get(p.id) ?? new Decimal(0), ctx);
      out.set(p.id, {
        fundedByLoans: r.fundedByLoans,
        fundedByLoansPct: r.fundedByLoansPct,
        monthlyIncome: r.monthlyIncome,
        totalIncomeReceived: r.totalIncomeReceived,
        grossYieldPct: r.grossYieldPct,
        linkedLoansCount: r.loans.length,
        linkedIncomeCount: r.incomes.length,
      });
    }
    return out;
  }

  // ─── Loan → project allocations ───────────────────────────────────────────

  /** Every loan → project allocation of the family, with project names (for chips on the Loans page). */
  async listFamilyAllocations(familyId: string) {
    const [allocations, projects] = await Promise.all([
      this.trackerRepo.findAllocationsByFamilyId(familyId),
      this.trackerRepo.findProjectsByFamilyId(familyId),
    ]);
    const names = new Map(projects.map((p) => [p.id, p.name]));
    return allocations.map((a) => ({
      loanId: a.loan_id,
      projectId: a.project_id,
      projectName: names.get(a.project_id) ?? 'Project',
      amount: new Decimal(a.amount.toString()).toFixed(2),
    }));
  }

  /** Allocations of one loan (family-scoped). */
  async getLoanAllocations(familyId: string, loanId: string) {
    const loan = await this.requireLoan(familyId, loanId);
    const rows = await this.trackerRepo.findAllocationsByLoanId(loanId);
    return {
      loanId,
      loanPrincipal: this.basePrincipal(loan).toFixed(2),
      allocations: rows.map((r) => ({ projectId: r.project_id, amount: new Decimal(r.amount.toString()).toFixed(2) })),
    };
  }

  /**
   * Replaces a loan's project allocations. Validates family ownership, positive amounts, unique projects
   * and that the total does not exceed the loan's original principal.
   */
  async setLoanAllocations(memberId: string, familyId: string, loanId: string, dto: SetLoanAllocationsDto) {
    const loan = await this.requireLoan(familyId, loanId);
    const requested = dto.allocations ?? [];

    const seen = new Set<string>();
    let total = new Decimal(0);
    const rows: Array<{ project_id: string; amount: string }> = [];
    for (const a of requested) {
      if (seen.has(a.projectId)) throw new BadRequestException('A project can appear only once per loan');
      seen.add(a.projectId);
      const project = await this.trackerRepo.findProjectById(a.projectId);
      if (!project || project.family_id !== familyId || !project.is_active) {
        throw new BadRequestException('Project not found in your family');
      }
      const amount = new Decimal(a.amount);
      if (!amount.gt(0)) throw new BadRequestException('Allocated amount must be greater than zero');
      total = total.plus(amount);
      rows.push({ project_id: a.projectId, amount: amount.toFixed(2) });
    }

    const base = this.basePrincipal(loan);
    if (total.gt(base)) {
      throw new BadRequestException(`Allocations (${total.toFixed(2)}) exceed the loan principal (${base.toFixed(2)})`);
    }

    const before = await this.trackerRepo.findAllocationsByLoanId(loanId);
    await this.trackerRepo.replaceLoanAllocations(loanId, rows);
    await this.auditRepo.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'loan_project_allocation',
      entity_id: loanId,
      action: 'update',
      field_changes: JSON.stringify({
        allocations: {
          old: before.map((b) => ({ projectId: b.project_id, amount: b.amount.toString() })),
          new: rows.map((r) => ({ projectId: r.project_id, amount: r.amount })),
        },
      }),
    });
    return this.getLoanAllocations(familyId, loanId);
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  private basePrincipal(loan: { principal: unknown; original_principal?: unknown }): Decimal {
    return new Decimal(((loan.original_principal ?? loan.principal) as { toString(): string }).toString());
  }

  private async requireLoan(familyId: string, loanId: string) {
    const loan = await this.loanRepo.findById(loanId);
    if (!loan || loan.family_id !== familyId || loan.deleted_at) throw new NotFoundException('Loan not found');
    return loan;
  }

  private async sumInvested(projectId: string): Promise<Decimal> {
    const expenses = await this.trackerRepo.findExpensesByProjectId(projectId);
    return expenses.reduce((s, e) => s.plus(new Decimal(e.total_cost.toString())), new Decimal(0));
  }

  /** Family-wide inputs loaded once per request. */
  private async loadFamilyContext(familyId: string) {
    const [allocations, incomes, receipts, loans] = await Promise.all([
      this.trackerRepo.findAllocationsByFamilyId(familyId),
      this.incomeRepo.findByFamilyId(familyId),
      this.incomeRepo.findAllReceiptsByFamily(familyId),
      this.loanRepo.findByFamilyId(familyId),
    ]);

    const receiptsByIncome = new Map<string, Array<{ yearMonth: string; amount: Decimal }>>();
    for (const r of receipts) {
      if (r.status !== 'received') continue;
      const list = receiptsByIncome.get(r.income_id) ?? [];
      list.push({ yearMonth: r.year_month, amount: new Decimal(r.received_amount.toString()) });
      receiptsByIncome.set(r.income_id, list);
    }

    const loanById = new Map(loans.filter((l) => !l.deleted_at).map((l) => [l.id, l]));
    const interestCache = new Map<string, Decimal>();
    const interestPaid = async (loan: (typeof loans)[number]): Promise<Decimal> => {
      const cached = interestCache.get(loan.id);
      if (cached) return cached;
      const schedule = await this.scheduleRepo.findByLoanId(loan.id);
      let total = schedule
        .filter((i) => i.is_paid)
        .reduce((s, i) => s.plus(new Decimal(i.interest_component.toString())), new Decimal(0));
      if (GOLD_LOAN_TYPES.has(loan.type)) {
        const payments = await this.prepaymentRepo.findByLoanId(loan.id);
        total = payments.reduce((s, p) => s.plus(new Decimal(p.accrued_interest.toString())), total);
      }
      interestCache.set(loan.id, total);
      return total;
    };

    return { allocations, incomes, receiptsByIncome, loanById, interestPaid };
  }

  private async computeForProject(
    project: { id: string; current_value?: unknown },
    invested: Decimal,
    ctx: Awaited<ReturnType<ProjectFundingService['loadFamilyContext']>>,
  ): Promise<FundingReturnsResult> {
    const loans: LoanFundingInput[] = [];
    for (const a of ctx.allocations.filter((x) => x.project_id === project.id)) {
      const loan = ctx.loanById.get(a.loan_id);
      if (!loan) continue;
      loans.push({
        loanId: loan.id,
        name: loan.name || loan.type,
        lender: loan.lender,
        type: loan.type,
        status: loan.status,
        allocated: new Decimal(a.amount.toString()),
        basePrincipal: this.basePrincipal(loan),
        outstanding: new Decimal((loan.current_outstanding_principal ?? loan.principal).toString()),
        emi: new Decimal(loan.emi_amount.toString()),
        interestPaid: await ctx.interestPaid(loan),
      });
    }

    const incomes: IncomeFundingInput[] = ctx.incomes
      .filter((i) => (i as { project_id?: string | null }).project_id === project.id)
      .map((i) => ({
        id: i.id,
        label: i.label,
        type: i.type,
        recurrence: i.recurrence,
        status: i.status,
        amount: new Decimal(i.amount.toString()),
        startDate: new Date(i.start_date),
        endDate: i.end_date ? new Date(i.end_date) : null,
        receipts: ctx.receiptsByIncome.get(i.id) ?? [],
      }));

    return calculateFundingReturns({
      invested,
      currentValue: project.current_value ? new Decimal((project.current_value as { toString(): string }).toString()) : null,
      loans,
      incomes,
      today: new Date(),
    });
  }
}
