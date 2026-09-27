import { CurrencyRate } from '@prisma/client';

export interface ICurrencyRateRepository {
  findByFamilyId(familyId: string): Promise<CurrencyRate[]>;
  findByPair(familyId: string, fromCurrency: string, toCurrency: string): Promise<CurrencyRate | null>;
  upsertRate(familyId: string, fromCurrency: string, toCurrency: string, rate: any): Promise<CurrencyRate>;
  deleteRate(id: string): Promise<void>;
}

export const I_CURRENCY_RATE_REPOSITORY = 'ICurrencyRateRepository';

