import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from 'decimal.js';
import { StrategyLoanInput } from './strategy-engine';

export interface GeminiSuggestionResponse {
  allocations: { loanId: string; extraAmount: string }[];
  rationale: string;
}

@Injectable()
export class GeminiAiService {
  private readonly logger = new Logger(GeminiAiService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Request debt repayment recommendations from Google Gemini.
   * Gracefully degrades (returns null) on timeout, missing key, or API errors.
   */
  async getAiStrategy(
    loans: StrategyLoanInput[],
    availableSurplus: Decimal,
    prepaymentMode: 'one_off_lump_sum' | 'recurring_monthly' = 'one_off_lump_sum',
  ): Promise<GeminiSuggestionResponse | null> {
    const configKey = this.configService?.get<string>('GEMINI_API_KEY');
    const apiKey = configKey !== undefined && configKey !== null ? configKey : process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your-gemini-api-key') {
      this.logger.debug('GEMINI_API_KEY not configured. Omitting AI strategy card gracefully.');
      return null;
    }

    const primaryModel = this.configService.get<string>('GEMINI_MODEL') || process.env.GEMINI_MODEL || 'gemini-flash-latest';
    const candidateModels = [primaryModel, 'gemini-3-flash-preview', 'gemini-3.1-flash-lite'].filter(
      (m, i, arr) => arr.indexOf(m) === i,
    );

    try {
      // 1. Prepare completely anonymized debt payload (No PII, no lender names)
      const anonymizedLoans = loans.map((l, index) => ({
        loan_ref: `LOAN_${index + 1}`,
        real_id: l.id,
        debt_type: l.type,
        principal: Number(l.principal.toFixed(2)),
        interest_rate_pct: Number(l.interestRate.toFixed(2)),
        monthly_emi: Number(l.emiAmount.toFixed(2)),
        tenure_months: l.tenureMonths,
        has_prepayment_penalty: Boolean(l.prepaymentPenaltyType && l.prepaymentPenaltyType !== 'none'),
      }));

      const isOneOff = prepaymentMode === 'one_off_lump_sum';
      const systemInstruction = `You are a certified financial advisor optimizing household debt prepayment.
Your goal is to allocate the family's ${isOneOff ? 'ONE-OFF lump-sum windfall' : 'recurring monthly surplus'} among their active loans to minimize total lifetime interest cost while balancing psychological momentum and cash-flow safety.
Return ONLY valid JSON matching this exact schema:
{
  "allocations": [
    { "loan_ref": "LOAN_1", "extra_amount": 50000 }
  ],
  "rationale": "A concise 2-sentence rationale explaining the financial wisdom of this distribution."
}
Do not exceed the total available extra amount across all allocations. Every loan_ref must match one of the provided loans.`;

      const prompt = `${isOneOff ? 'Available ONE-OFF lump-sum prepayment amount: ' : 'Available recurring monthly surplus: '}${availableSurplus.toFixed(2)} INR.
Prepayment mode: ${isOneOff ? 'ONE-OFF (single lump sum applied this month, not recurring)' : 'RECURRING (available every month)'}.
Active family debts:
${JSON.stringify(anonymizedLoans, null, 2)}

Provide the optimal allocation and concise financial rationale.`;

      for (const model of candidateModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemInstruction }],
              },
              contents: [
                {
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                response_mime_type: 'application/json',
                temperature: 0.2,
              },
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            this.logger.warn(`Gemini model ${model} returned status ${response.status}: ${errorText}. Trying fallback model...`);
            continue;
          }

          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) continue;

          const parsed = JSON.parse(rawText);
          if (!parsed.allocations || !Array.isArray(parsed.allocations)) continue;

          // Map anonymized loan_refs back to actual loan IDs
          const mappedAllocations: { loanId: string; extraAmount: string }[] = [];
          for (const item of parsed.allocations) {
            const matching = anonymizedLoans.find((a) => a.loan_ref === item.loan_ref);
            if (matching) {
              mappedAllocations.push({
                loanId: matching.real_id,
                extraAmount: new Decimal(item.extra_amount || 0).toFixed(2),
              });
            }
          }

          return {
            allocations: mappedAllocations,
            rationale: parsed.rationale || 'AI recommendation prioritizing high-interest mitigation and liquidity safety.',
          };
        } catch (mErr: any) {
          this.logger.warn(`Model ${model} failed: ${mErr.message}. Trying next fallback...`);
        }
      }

      this.logger.warn('All candidate Gemini models failed. Gracefully omitting AI strategy.');
      return null;
    } catch (err: any) {
      this.logger.warn(`Gemini AI service error: ${err.message}. Gracefully omitting AI strategy.`);
      return null;
    }
  }
}

