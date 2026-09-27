import { Injectable } from '@nestjs/common';
import { CurrencyRate } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ICurrencyRateRepository } from '../interfaces';

@Injectable()
export class PrismaCurrencyRateRepository implements ICurrencyRateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByFamilyId(familyId: string): Promise<CurrencyRate[]> {
    return this.prisma.currencyRate.findMany({
      where: { family_id: familyId },
      orderBy: { from_currency: 'asc' },
    });
  }

  async findByPair(familyId: string, fromCurrency: string, toCurrency: string): Promise<CurrencyRate | null> {
    return this.prisma.currencyRate.findUnique({
      where: {
        family_id_from_currency_to_currency: {
          family_id: familyId,
          from_currency: fromCurrency,
          to_currency: toCurrency,
        },
      },
    });
  }

  async upsertRate(familyId: string, fromCurrency: string, toCurrency: string, rate: any): Promise<CurrencyRate> {
    return this.prisma.currencyRate.upsert({
      where: {
        family_id_from_currency_to_currency: {
          family_id: familyId,
          from_currency: fromCurrency,
          to_currency: toCurrency,
        },
      },
      update: {
        rate,
      },
      create: {
        family_id: familyId,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate,
      },
    });
  }

  async deleteRate(id: string): Promise<void> {
    await this.prisma.currencyRate.delete({ where: { id } });
  }
}

