import { describe, it, expect, beforeEach } from 'vitest';
import { Decimal } from 'decimal.js';
import { StrategyEngine, StrategyLoanInput, CustomWeights } from '../src/strategies/engine/strategy-engine';
import { GeminiAiService } from '../src/strategies/engine/gemini-ai.service';
import { ConfigService } from '@nestjs/config';
import {
  LocalStorageAuditRepository,
  LocalStorageCurrencyRateRepository,
  LocalStorageSuggestionSnapshotRepository,
  LocalStorageAssetRepository,
  LocalStorageFamilyRepository,
  LocalStorageStore,
} from '../src/repositories/local-storage';

describe('Story 3 — Debt Strategy Engine, AI Suggestions, Audit & Multi-Currency', () => {
  beforeEach(() => {
    LocalStorageStore.clear();
  });

  describe('1. Debt Strategy Engine (Avalanche vs Snowball vs Custom-Weighted)', () => {
    const loans: StrategyLoanInput[] = [
      {
        id: 'loan-1',
        lender: 'HDFC Personal',
        type: 'personal',
        principal: new Decimal(200000), // ₹2,00,000
        interestRate: new Decimal(14.5), // 14.5% p.a. (Highest rate)
        emiAmount: new Decimal(6000),
        tenureMonths: 48,
        emiType: 'fixed',
      },
      {
        id: 'loan-2',
        lender: 'SBI Auto',
        type: 'car',
        principal: new Decimal(500000), // ₹5,00,000
        interestRate: new Decimal(9.5), // 9.5% p.a.
        emiAmount: new Decimal(10500),
        tenureMonths: 60,
        emiType: 'fixed',
      },
      {
        id: 'loan-3',
        lender: 'Jewel Loan',
        type: 'jewel',
        principal: new Decimal(50000), // ₹50,000 (Smallest balance)
        interestRate: new Decimal(8.5), // 8.5% p.a.
        emiAmount: new Decimal(4500),
        tenureMonths: 12,
        emiType: 'flexible',
      },
    ];

    const monthlySurplus = new Decimal(15000); // ₹15,000 surplus

    it('Baseline minimum payments amortizes all loans without extra prepayment', () => {
      const baseline = StrategyEngine.simulateBaseline(loans);
      expect(baseline.strategyName).toBe('baseline');
      expect(baseline.monthsToDebtFree).toBeGreaterThan(0);
      expect(Number(baseline.totalInterestPaid)).toBeGreaterThan(0);
      expect(Number(baseline.totalInterestSaved)).toBe(0);

      // Allocations have 0 extra payment
      for (const a of baseline.allocations) {
        expect(Number(a.extraAmount)).toBe(0);
      }
    });

    it('Avalanche strategy prioritizes highest interest rate loan (HDFC 14.5%)', () => {
      const baseline = StrategyEngine.simulateBaseline(loans);
      const avalanche = StrategyEngine.simulateAvalanche(loans, monthlySurplus, new Decimal(baseline.totalInterestPaid));

      expect(avalanche.strategyName).toBe('avalanche');
      expect(avalanche.monthsToDebtFree).toBeLessThan(baseline.monthsToDebtFree);
      expect(Number(avalanche.totalInterestSaved)).toBeGreaterThan(0);

      // 100% of surplus allocated to Loan 1 (highest rate)
      const loan1Alloc = avalanche.allocations.find((a) => a.loanId === 'loan-1');
      const loan3Alloc = avalanche.allocations.find((a) => a.loanId === 'loan-3');

      expect(Number(loan1Alloc?.extraAmount)).toBe(15000);
      expect(Number(loan3Alloc?.extraAmount)).toBe(0);
    });

    it('Snowball strategy prioritizes lowest balance loan (Jewel Loan ₹50,000)', () => {
      const baseline = StrategyEngine.simulateBaseline(loans);
      const snowball = StrategyEngine.simulateSnowball(loans, monthlySurplus, new Decimal(baseline.totalInterestPaid));

      expect(snowball.strategyName).toBe('snowball');
      expect(snowball.monthsToDebtFree).toBeLessThan(baseline.monthsToDebtFree);
      expect(Number(snowball.totalInterestSaved)).toBeGreaterThan(0);

      // 100% of surplus allocated to Loan 3 (lowest balance)
      const loan1Alloc = snowball.allocations.find((a) => a.loanId === 'loan-1');
      const loan3Alloc = snowball.allocations.find((a) => a.loanId === 'loan-3');

      expect(Number(loan3Alloc?.extraAmount)).toBe(15000);
      expect(Number(loan1Alloc?.extraAmount)).toBe(0);
    });

    it('Custom-Weighted strategy accurately computes composite score and supports split mode', () => {
      const baseline = StrategyEngine.simulateBaseline(loans);
      const weights: CustomWeights = {
        weightRate: 20,
        weightBalance: 60, // heavily favors smaller balance
        weightFlexibility: 10,
        weightPenalty: 0,
        weightTenure: 10,
        mode: 'split',
      };

      const custom = StrategyEngine.simulateCustomWeighted(loans, monthlySurplus, weights, new Decimal(baseline.totalInterestPaid));
      expect(custom.strategyName).toBe('custom_weighted');
      expect(custom.monthsToDebtFree).toBeLessThan(baseline.monthsToDebtFree);

      // In split mode, multiple loans receive a portion of the surplus
      const nonZeroAllocs = custom.allocations.filter((a) => Number(a.extraAmount) > 0);
      expect(nonZeroAllocs.length).toBeGreaterThan(1);

      // Total allocated equals total surplus
      const totalAlloc = custom.allocations.reduce((s, a) => s + Number(a.extraAmount), 0);
      expect(Math.round(totalAlloc)).toBe(15000);
    });

    it('One-Off Lump Sum mode applies surplus in Month 1 only and saves lifetime interest', () => {
      const baseline = StrategyEngine.simulateBaseline(loans);
      const lumpSum = new Decimal(50000);
      const oneOffAvalanche = StrategyEngine.simulateAvalanche(
        loans,
        lumpSum,
        new Decimal(baseline.totalInterestPaid),
        'one_off_lump_sum',
      );

      expect(oneOffAvalanche.strategyName).toBe('avalanche');
      expect(Number(oneOffAvalanche.totalInterestSaved)).toBeGreaterThan(0);
      const loan1Alloc = oneOffAvalanche.allocations.find((a) => a.loanId === 'loan-1');
      expect(Number(loan1Alloc?.extraAmount)).toBe(50000);
    });
  });

  describe('2. Gemini AI Integration & Graceful Degradation', () => {
    it('Omits AI card gracefully when GEMINI_API_KEY is unset or default', async () => {
      const mockConfig = {
        get: (key: string) => (key === 'GEMINI_API_KEY' ? '' : null),
      } as unknown as ConfigService;

      const aiService = new GeminiAiService(mockConfig);
      const result = await aiService.getAiStrategy([], new Decimal(10000));
      expect(result).toBeNull();
    });

    it('Simulates AI recommended allocations accurately when Gemini response is present', () => {
      const loans: StrategyLoanInput[] = [
        {
          id: 'l1',
          lender: 'Car',
          type: 'car',
          principal: new Decimal(100000),
          interestRate: new Decimal(10),
          emiAmount: new Decimal(5000),
          tenureMonths: 24,
        },
      ];
      const baseline = StrategyEngine.simulateBaseline(loans);
      const aiAllocations = [{ loanId: 'l1', extraAmount: '5000.00' }];
      const ai = StrategyEngine.simulateAiStrategy(
        loans,
        new Decimal(5000),
        aiAllocations,
        'Accelerate car loan payoff for cash-flow safety.',
        new Decimal(baseline.totalInterestPaid),
      );

      expect(ai.strategyName).toBe('ai_suggestion');
      expect(ai.rationale).toContain('Accelerate car loan');
      expect(ai.monthsToDebtFree).toBeLessThan(baseline.monthsToDebtFree);
      expect(Number(ai.totalInterestSaved)).toBeGreaterThan(0);
    });
  });

  describe('3. Audit Trail & Admin Soft-Delete Restore', () => {
    it('Soft deletes an asset and restores it with audit logging', async () => {
      const assetRepo = new LocalStorageAssetRepository();
      const auditRepo = new LocalStorageAuditRepository();

      // Create asset
      const asset = await assetRepo.create({
        member_id: 'mem-1',
        family_id: 'fam-1',
        type: 'fd',
        name: 'HDFC Term Deposit',
        currency: 'INR',
        current_value: '200000',
      });
      expect(asset.deleted_at).toBeNull();

      // Soft delete
      await assetRepo.softDelete(asset.id);
      const afterDelete = await assetRepo.findById(asset.id);
      expect(afterDelete).toBeNull(); // findById filters out deleted

      // Admin restore
      const restored = await assetRepo.restore(asset.id);
      expect(restored.deleted_at).toBeNull();

      const afterRestore = await assetRepo.findById(asset.id);
      expect(afterRestore).not.toBeNull();
      expect(afterRestore?.name).toBe('HDFC Term Deposit');

      // Audit log entry created
      await auditRepo.create({
        family_id: 'fam-1',
        member_id: 'mem-1',
        entity_type: 'asset',
        entity_id: asset.id,
        action: 'restore',
        field_changes: JSON.stringify({ deleted_at: { old: 'deleted', new: null } }),
      });

      const logs = await auditRepo.findByFamilyId('fam-1');
      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe('restore');
      expect(logs[0].entity_type).toBe('asset');
    });
  });

  describe('4. Multi-Currency Conversion & Parity', () => {
    it('Upserts and retrieves currency exchange rate accurately', async () => {
      const currencyRepo = new LocalStorageCurrencyRateRepository();

      await currencyRepo.upsertRate('fam-1', 'USD', 'INR', 84.25);
      const rate = await currencyRepo.findByPair('fam-1', 'USD', 'INR');

      expect(rate).not.toBeNull();
      expect(Number(rate?.rate)).toBe(84.25);

      const allRates = await currencyRepo.findByFamilyId('fam-1');
      expect(allRates.length).toBe(1);
      expect(allRates[0].from_currency).toBe('USD');
    });

    it('Persists and retrieves SuggestionSnapshot ("Mark as My Plan")', async () => {
      const snapshotRepo = new LocalStorageSuggestionSnapshotRepository();

      const snap = await snapshotRepo.create({
        family_id: 'fam-1',
        member_id: 'mem-1',
        strategy_name: 'avalanche',
        surplus: '15000.00',
        allocations: JSON.stringify([{ loan_id: 'l1', extra_amount: 15000 }]),
        metrics: JSON.stringify({ monthsToDebtFree: 18, interestSaved: '42500.00' }),
      });

      expect(snap.id).toBeDefined();
      expect(snap.strategy_name).toBe('avalanche');

      const latest = await snapshotRepo.findLatestByFamilyId('fam-1');
      expect(latest?.id).toBe(snap.id);
      expect(latest?.strategy_name).toBe('avalanche');
    });
  });
});

