import { describe, it, expect } from 'vitest';
import { GoldLoanCalculator } from '../src/loans/engine/gold-loan.calculator';

describe('Story 4 — Gold Loan Logic & Verification Table', () => {
  it('reproduces reference test case 1 (4,00,000 @ 11%) matching user screenshots to exact Rupee', () => {
    const summary = GoldLoanCalculator.calculateLedger(
      {
        principal: 400000,
        annualRatePercent: 11,
        disbursalDate: '2026-09-28',
        maturityDate: '2027-09-28',
        paidUpfrontFees: true,
        transactions: [
          {
            date: '2026-10-28',
            type: 'PAYMENT',
            amount: 5000,
            note: 'Festival bonus',
          },
        ],
      },
      '2026-09-28',
    );

    const { monthByMonth, totals, scenarios, chartData, paymentsWithSavings } = summary;

    // Check month rows count = 13 (Sep 26 to Sep 27 maturity)
    expect(monthByMonth.length).toBe(13);

    // Month 1: 30 Sept 2026, 3 days, Interest 361, Closing 400,361
    const m1 = monthByMonth[0];
    expect(m1.days).toBe(3);
    expect(m1.interest).toBe(361);
    expect(m1.closingYours).toBe(400361);
    expect(m1.closingNoPay).toBe(400361);

    // Month 2: 31 Oct 2026, 31 days, Payment 5000, Interest 3734, Closing Yours 399,095, Closing No Pay 404,101
    const m2 = monthByMonth[1];
    expect(m2.days).toBe(31);
    expect(m2.payment).toBe(5000);
    expect(m2.interest).toBe(3734);
    expect(m2.closingYours).toBe(399095);
    expect(m2.closingNoPay).toBe(404101);

    // Month 13: 27 Sept 2027 (maturity), 27 days, Interest 3558, Closing Yours 440,760, Closing No Pay 446,290
    const m13 = monthByMonth[12];
    expect(m13.days).toBe(27);
    expect(m13.interest).toBe(3558);
    expect(m13.closingYours).toBe(440760);
    expect(m13.closingNoPay).toBe(446290);

    // Totals
    expect(totals.totalDays).toBe(365);
    expect(totals.totalPayments).toBe(5000);
    expect(totals.totalInterestYours).toBe(45760);
    expect(totals.totalInterestNoPay).toBe(46290);
    expect(totals.finalClosingYours).toBe(440760);
    expect(totals.finalClosingNoPay).toBe(446290);

    // Scenario A: Pay nothing till maturity
    expect(scenarios.scenarioA.finalDueAtMaturity).toBe(446290);
    expect(scenarios.scenarioA.totalInterest).toBe(46290);

    // Scenario B: Your payments
    expect(scenarios.scenarioB.totalPaidAlongWay).toBe(5000);
    expect(scenarios.scenarioB.finalDueAtMaturity).toBe(440760);
    expect(scenarios.scenarioB.totalCost).toBe(445760);
    expect(scenarios.scenarioB.interestSavedVsA).toBe(530);

    // Scenario C: Pay each month's interest
    expect(scenarios.scenarioC.principalDueAtMaturity).toBe(400000);
    expect(scenarios.scenarioC.totalCost).toBe(443998);
    expect(scenarios.scenarioC.interestSavedVsA).toBe(2292);

    // Payments with savings
    expect(paymentsWithSavings.length).toBe(1);
    expect(paymentsWithSavings[0].amount).toBe(5000);
    expect(paymentsWithSavings[0].interestSavedByMaturity).toBe(530);

    // Chart data
    expect(chartData.length).toBe(14); // Start + 13 months
  });

  it('reproduces reference test case 2 (3,90,000 @ 11%) within Rs 1', () => {
    const summary = GoldLoanCalculator.calculateLedger(
      {
        principal: 390000,
        annualRatePercent: 11,
        disbursalDate: '2025-12-16',
        maturityDate: '2026-12-16',
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

    // 7. 31/05/2026: Interest 3770, Balance 405,016
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

    // Top card as of 2026-08-31
    expect(summary.asOfStats.postedBalance).toBe(416350);
  });
});
