import { describe, it, expect } from 'vitest';
import { GoldLoanCalculator } from '../src/loans/engine/gold-loan.calculator';

describe('Story 4 — Gold Loan Logic & Verification Table', () => {
  it('reproduces the reference test case from Story 4 §4 within Rs 1', () => {
    const summary = GoldLoanCalculator.calculateLedger(
      {
        principal: 390000,
        annualRatePercent: 11,
        disbursalDate: '2025-12-16',
        maturityDate: '2026-08-31',
        paidUpfrontFees: true,
        transactions: [
          {
            date: '2026-05-15',
            type: 'PAYMENT',
            amount: 5000,
            note: 'Extra Payment',
          },
        ],
      },
      '2026-08-31',
    );

    const { ledger } = summary;

    // Disbursal
    expect(ledger[0].date).toBe('2025-12-16');
    expect(ledger[0].type).toBe('DISBURSAL');
    expect(ledger[0].balanceAfter).toBe(390000);

    // 1. 31/12/2025: Interest 1880, Balance 391,880
    const dec2025 = ledger.find((e) => e.date === '2025-12-31' && e.type === 'INTEREST_POSTED')!;
    expect(dec2025).toBeDefined();
    expect(dec2025.amount).toBe(1880);
    expect(dec2025.balanceAfter).toBe(391880);

    // 2. 31/01/2026: Interest 3661, Balance 395,541
    const jan2026 = ledger.find((e) => e.date === '2026-01-31' && e.type === 'INTEREST_POSTED')!;
    expect(jan2026).toBeDefined();
    expect(jan2026.amount).toBe(3661);
    expect(jan2026.balanceAfter).toBe(395541);

    // 3. 28/02/2026: Interest 3338, Balance 398,879
    const feb2026 = ledger.find((e) => e.date === '2026-02-28' && e.type === 'INTEREST_POSTED')!;
    expect(feb2026).toBeDefined();
    expect(feb2026.amount).toBe(3338);
    expect(feb2026.balanceAfter).toBe(398879);

    // 4. 31/03/2026: Interest 3727, Balance 402,606
    const mar2026 = ledger.find((e) => e.date === '2026-03-31' && e.type === 'INTEREST_POSTED')!;
    expect(mar2026).toBeDefined();
    expect(mar2026.amount).toBe(3727);
    expect(mar2026.balanceAfter).toBe(402606);

    // 5. 30/04/2026: Interest 3640, Balance 406,246
    const apr2026 = ledger.find((e) => e.date === '2026-04-30' && e.type === 'INTEREST_POSTED')!;
    expect(apr2026).toBeDefined();
    expect(apr2026.amount).toBe(3640);
    expect(apr2026.balanceAfter).toBe(406246);

    // 6. 15/05/2026: Payment 5000, Balance 401,246
    const mayPayment = ledger.find((e) => e.date === '2026-05-15' && e.type === 'PAYMENT')!;
    expect(mayPayment).toBeDefined();
    expect(mayPayment.amount).toBe(5000);
    expect(mayPayment.balanceAfter).toBe(401246);

    // 7. 31/05/2026: Interest 3770 (14 days on 406,246 + 17 days on 401,246), Balance 405,016
    const may2026 = ledger.find((e) => e.date === '2026-05-31' && e.type === 'INTEREST_POSTED')!;
    expect(may2026).toBeDefined();
    expect(may2026.amount).toBe(3770);
    expect(may2026.balanceAfter).toBe(405016);

    // 8. 30/06/2026: Interest 3662, Balance 408,678
    const jun2026 = ledger.find((e) => e.date === '2026-06-30' && e.type === 'INTEREST_POSTED')!;
    expect(jun2026).toBeDefined();
    expect(jun2026.amount).toBe(3662);
    expect(jun2026.balanceAfter).toBe(408678);

    // 9. 31/07/2026: Interest 3818, Balance 412,496
    const jul2026 = ledger.find((e) => e.date === '2026-07-31' && e.type === 'INTEREST_POSTED')!;
    expect(jul2026).toBeDefined();
    expect(jul2026.amount).toBe(3818);
    expect(jul2026.balanceAfter).toBe(412496);

    // 10. 31/08/2026: Interest 3854, Balance 416,350
    const aug2026 = ledger.find((e) => e.date === '2026-08-31' && e.type === 'INTEREST_POSTED')!;
    expect(aug2026).toBeDefined();
    expect(aug2026.amount).toBe(3854);
    expect(aug2026.balanceAfter).toBe(416350);
  });
});
