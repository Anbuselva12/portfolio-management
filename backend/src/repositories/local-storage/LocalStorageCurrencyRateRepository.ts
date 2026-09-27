import { Injectable } from '@nestjs/common';
import { CurrencyRate } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { ICurrencyRateRepository } from '../interfaces';
import { LocalStorageStore } from './LocalStorageStore';

@Injectable()
export class LocalStorageCurrencyRateRepository implements ICurrencyRateRepository {
  private get items(): CurrencyRate[] {
    return LocalStorageStore.getCollection<CurrencyRate>('currency_rates');
  }

  async findByFamilyId(familyId: string): Promise<CurrencyRate[]> {
    return this.items.filter((r) => r.family_id === familyId).map((r) => ({ ...r }));
  }

  async findByPair(familyId: string, fromCurrency: string, toCurrency: string): Promise<CurrencyRate | null> {
    const item = this.items.find(
      (r) => r.family_id === familyId && r.from_currency === fromCurrency && r.to_currency === toCurrency,
    );
    return item ? { ...item } : null;
  }

  async upsertRate(familyId: string, fromCurrency: string, toCurrency: string, rate: any): Promise<CurrencyRate> {
    const decRate = new Decimal(rate.toString()) as any;
    const existingIndex = this.items.findIndex(
      (r) => r.family_id === familyId && r.from_currency === fromCurrency && r.to_currency === toCurrency,
    );

    if (existingIndex >= 0) {
      this.items[existingIndex].rate = decRate;
      this.items[existingIndex].updated_at = new Date();
      return { ...this.items[existingIndex] };
    }

    const newItem: CurrencyRate = {
      id: LocalStorageStore.generateId(),
      family_id: familyId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: decRate,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.items.push(newItem);
    return { ...newItem };
  }

  async deleteRate(id: string): Promise<void> {
    const index = this.items.findIndex((r) => r.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }
}

