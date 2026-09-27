import { Injectable } from '@nestjs/common';
import { SuggestionSnapshot } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { ISuggestionSnapshotRepository } from '../interfaces';
import { LocalStorageStore } from './LocalStorageStore';

@Injectable()
export class LocalStorageSuggestionSnapshotRepository implements ISuggestionSnapshotRepository {
  private get items(): SuggestionSnapshot[] {
    return LocalStorageStore.getCollection<SuggestionSnapshot>('suggestion_snapshots');
  }

  async create(data: {
    family_id: string;
    member_id: string;
    strategy_name: string;
    surplus: any;
    allocations: string;
    metrics: string;
  }): Promise<SuggestionSnapshot> {
    const item: SuggestionSnapshot = {
      id: LocalStorageStore.generateId(),
      family_id: data.family_id,
      member_id: data.member_id,
      strategy_name: data.strategy_name,
      surplus: new Decimal(data.surplus.toString()) as any,
      allocations: data.allocations,
      metrics: data.metrics,
      created_at: new Date(),
    };
    this.items.push(item);
    return { ...item };
  }

  async findLatestByFamilyId(familyId: string): Promise<SuggestionSnapshot | null> {
    const familyItems = this.items
      .filter((s) => s.family_id === familyId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return familyItems[0] ? { ...familyItems[0] } : null;
  }

  async findByFamilyId(familyId: string): Promise<SuggestionSnapshot[]> {
    return this.items
      .filter((s) => s.family_id === familyId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((s) => ({ ...s }));
  }
}

