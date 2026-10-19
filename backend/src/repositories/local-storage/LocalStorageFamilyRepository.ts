import { Injectable } from '@nestjs/common';
import { Family } from '@prisma/client';
import { IFamilyRepository } from '../interfaces';
import { LocalStorageStore } from './LocalStorageStore';

@Injectable()
export class LocalStorageFamilyRepository implements IFamilyRepository {
  private get items(): Family[] {
    return LocalStorageStore.getCollection<Family>('families');
  }

  async findById(id: string): Promise<Family | null> {
    const item = this.items.find((f) => f.id === id);
    return item ? { ...item } : null;
  }

  async findDiscoverable(): Promise<Family[]> {
    return this.items
      .filter((f) => f.is_discoverable)
      .map((f) => {
        const members = LocalStorageStore.getCollection('members').filter((m) => m.family_id === f.id);
        return {
          ...f,
          _count: { members: members.length },
        } as any;
      });
  }

  async create(data: {
    name: string;
    base_currency: string;
    country: string;
    join_policy: string;
    is_discoverable: boolean;
  }): Promise<Family> {
    const family: Family = {
      id: LocalStorageStore.generateId(),
      name: data.name,
      base_currency: data.base_currency,
      country: data.country,
      join_policy: data.join_policy,
      is_discoverable: data.is_discoverable,
      is_personal: false,
      owner_member_id: null,
      strategy_weights: null,
      created_at: new Date(),
    };
    this.items.push(family);
    return { ...family };
  }

  async update(id: string, data: Partial<Family>): Promise<Family> {
    const index = this.items.findIndex((f) => f.id === id);
    if (index === -1) throw new Error(`Family ${id} not found`);
    const updated = { ...this.items[index], ...data };
    this.items[index] = updated;
    return { ...updated };
  }
}

